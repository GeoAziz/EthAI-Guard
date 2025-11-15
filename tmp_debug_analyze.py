from fastapi.testclient import TestClient
import importlib
from unittest.mock import MagicMock
import logging

logging.basicConfig(level=logging.DEBUG)

an = importlib.import_module('ai_core.routers.analyze')
# patch db funcs
setattr(an, 'get_db', lambda: MagicMock())
setattr(an, 'store_analysis', lambda db, name, doc: 'patched_id')

from ai_core.main import app
client = TestClient(app)
payload = {"dataset_name":"demo","data":{"feature":[1,1,0,0],"sensitive":[0,0,1,1],"target":[1,1,0,0]}}
resp = client.post('/ai_core/analyze', json=payload)
print('status', resp.status_code)
print('body', resp.json())
