import sys, types
import pandas as pd

# prepare fake persistence
persist = types.ModuleType('ai_core.utils.persistence')

class FakeColl:
    def __init__(self):
        self.replaced = None
    def replace_one(self, _filter, doc, upsert=False):
        print('replace_one called')
        self.replaced = doc

class FakeDB:
    def __init__(self):
        self._coll = FakeColl()
    def get_collection(self, name):
        return self._coll

fake_db = FakeDB()

def get_db():
    print('get_db called')
    return fake_db

def get_shap_cache(db, mh, bh):
    print('get_shap_cache called', mh, bh)
    return None

def set_shap_cache(db, mh, bh, summary):
    print('set_shap_cache called', mh, bh, summary)
    coll = db.get_collection('shap_cache')
    coll.replace_one({'model_hash': mh, 'baseline_hash': bh}, {'model_hash': mh, 'baseline_hash': bh, 'shap_summary': summary}, upsert=True)

persist.get_db = get_db  # type: ignore
persist.get_shap_cache = get_shap_cache  # type: ignore
persist.set_shap_cache = set_shap_cache  # type: ignore

sys.modules['ai_core.utils.persistence'] = persist  # type: ignore

from ai_core.utils.model_helper import train_quick_model, explain_model

X = pd.DataFrame({"f1": [0.1, 0.9, 0.2, 0.8], "f2": [1, 0, 1, 0]})
import pandas as pd

y = pd.Series([0,1,0,1])
model = train_quick_model(X, y)
res = explain_model(model, X)
print('result:', res)
coll = fake_db.get_collection('shap_cache')
print('coll.replaced:', coll.replaced)
