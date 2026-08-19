"""Validate Orders + cross-domain + behaviour models: structural checks + round-trip."""
import json, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
errs = []
def load(p):
    t = (ROOT/p).read_text(encoding='utf-8')
    d = json.loads(t)
    if json.dumps(json.loads(json.dumps(d, sort_keys=True)), sort_keys=True) != json.dumps(d, sort_keys=True):
        errs.append(p + ': round-trip failed')
    return d
o = load('model/VANILLA-ORDERS.json')
s = json.loads((ROOT/'schemas/vanilla-orders.schema.json').read_text(encoding='utf-8'))
for key, spec in s['properties'].items():
    if key in s['required'] and key not in o:
        errs.append('orders: missing ' + key)
    if key in o and spec.get('type') == 'array':
        if len(o[key]) < spec.get('minItems', 0):
            errs.append('orders: ' + key + ' below minItems')
        req = spec.get('items', {}).get('required', [])
        for i, item in enumerate(o[key]):
            for r in req:
                if r not in item:
                    errs.append(f'orders: {key}[{i}] missing {r}')
x = load('model/CROSS-DOMAIN-RELATIONSHIPS.json')
for i, e in enumerate(x.get('edges', [])):
    for r in ('id', 'edge', 'grade', 'evidence'):
        if r not in e: errs.append(f'crossdomain: edges[{i}] missing {r}')
    if e.get('grade') not in ('STRUCTURAL', 'CONTROLLED_VERIFIED'):
        errs.append(f'crossdomain: edges[{i}] bad grade')
b = load('model/VERIFIED-BEHAVIOURS.json')
for i, e in enumerate(b.get('behaviours', [])):
    for r in ('id', 'claim', 'grade', 'evidence'):
        if r not in e: errs.append(f'behaviours[{i}] missing {r}')
    if e.get('grade') not in ('PASSIVELY_OBSERVED', 'CONTROLLED_VERIFIED'):
        errs.append(f'behaviours[{i}] bad grade')
if errs:
    print('FAIL:'); [print(' -', e) for e in errs]; sys.exit(1)
print(f"OK: orders ({len(o['orderStatuses'])} statuses, {len(o['supplierActions'])} supplier actions), "
      f"cross-domain ({len(x['edges'])} edges), behaviours ({len(b['behaviours'])}) all validate + round-trip.")
