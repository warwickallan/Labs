/* docx.js — read the TEXT out of a .docx in the browser, with no library.
 *
 * A .docx is a ZIP whose word/document.xml holds the prose. Everything the
 * Studio needs is therefore: parse the ZIP central directory, inflate the
 * one entry, strip the XML to text. Browsers can inflate raw DEFLATE
 * natively (DecompressionStream('deflate-raw')), so this stays a zero-build
 * vanilla module — no JSZip, no CDN, nothing to bundle.
 *
 * Deliberately narrow: text only, in reading order, with paragraph and
 * table-cell boundaries preserved (SRD requirements live in both). Images,
 * styling, tracked changes and comments are ignored — the SRD parser wants
 * sentences, not formatting. Anything it cannot read fails LOUDLY with a
 * reason, never silently as empty text.
 *
 * window.StudioDocx.extractText(File|ArrayBuffer) -> Promise<string>
 */
(function () {
  'use strict';

  function u16(dv, off) { return dv.getUint16(off, true); }
  function u32(dv, off) { return dv.getUint32(off, true); }

  /* Locate the End Of Central Directory record and walk the entries. */
  function entries(buf) {
    var dv = new DataView(buf);
    var len = buf.byteLength;
    var eocd = -1;
    /* EOCD is at the end, but a trailing comment can push it back up to 64k */
    for (var i = len - 22; i >= Math.max(0, len - 22 - 65535); i--) {
      if (u32(dv, i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('not a ZIP archive (no end-of-central-directory record) — is this really a .docx?');
    var count = u16(dv, eocd + 10);
    var start = u32(dv, eocd + 16);
    var out = [];
    var p = start;
    for (var n = 0; n < count; n++) {
      if (u32(dv, p) !== 0x02014b50) break;
      var method = u16(dv, p + 10);
      var compSize = u32(dv, p + 20);
      var nameLen = u16(dv, p + 28);
      var extraLen = u16(dv, p + 30);
      var commentLen = u16(dv, p + 32);
      var localOff = u32(dv, p + 42);
      var name = new TextDecoder().decode(new Uint8Array(buf, p + 46, nameLen));
      out.push({ name: name, method: method, compSize: compSize, localOff: localOff });
      p += 46 + nameLen + extraLen + commentLen;
    }
    return out;
  }

  /* Raw bytes of one entry, honouring the LOCAL header's own name/extra
     lengths (they can differ from the central directory's). */
  function rawBytes(buf, entry) {
    var dv = new DataView(buf);
    if (u32(dv, entry.localOff) !== 0x04034b50) throw new Error('corrupt ZIP: bad local header for ' + entry.name);
    var nameLen = u16(dv, entry.localOff + 26);
    var extraLen = u16(dv, entry.localOff + 28);
    var dataAt = entry.localOff + 30 + nameLen + extraLen;
    return new Uint8Array(buf, dataAt, entry.compSize);
  }

  function inflate(bytes) {
    if (typeof DecompressionStream === 'undefined') {
      return Promise.reject(new Error('this browser cannot inflate ZIP entries (no DecompressionStream) — save the document as .txt and upload that'));
    }
    var ds = new DecompressionStream('deflate-raw');
    var stream = new Blob([bytes]).stream().pipeThrough(ds);
    return new Response(stream).arrayBuffer().then(function (ab) {
      return new TextDecoder().decode(new Uint8Array(ab));
    });
  }

  /* WordprocessingML -> plain text. Paragraphs and table cells become
     newlines; <w:tab/> becomes a space; everything else is dropped. */
  function xmlToText(xml) {
    return xml
      .replace(/<w:tab\b[^>]*\/>/g, ' ')
      .replace(/<w:br\b[^>]*\/>/g, '\n')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<\/w:tc>/g, '\n')
      .replace(/<\/w:tr>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/ /g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function fromBuffer(buf) {
    var list;
    try {
      list = entries(buf);
    } catch (e) {
      return Promise.reject(e);
    }
    var doc = list.filter(function (e) { return e.name === 'word/document.xml'; })[0];
    if (!doc) {
      return Promise.reject(new Error('no word/document.xml inside — this ZIP is not a Word document (entries: ' +
        list.slice(0, 6).map(function (e) { return e.name; }).join(', ') + ')'));
    }
    var bytes;
    try {
      bytes = rawBytes(buf, doc);
    } catch (e) {
      return Promise.reject(e);
    }
    /* method 0 = stored (rare but legal), 8 = deflate */
    var text = doc.method === 0
      ? Promise.resolve(new TextDecoder().decode(bytes))
      : inflate(bytes);
    return text.then(function (xml) {
      var out = xmlToText(xml);
      if (!out) throw new Error('the document parsed but contains no readable text');
      return out;
    });
  }

  function extractText(fileOrBuffer) {
    if (fileOrBuffer instanceof ArrayBuffer) return fromBuffer(fileOrBuffer);
    if (fileOrBuffer && typeof fileOrBuffer.arrayBuffer === 'function') {
      return fileOrBuffer.arrayBuffer().then(fromBuffer);
    }
    return Promise.reject(new Error('extractText needs a File or ArrayBuffer'));
  }

  var api = { extractText: extractText, _xmlToText: xmlToText, _entries: entries };
  if (typeof window !== 'undefined') window.StudioDocx = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
