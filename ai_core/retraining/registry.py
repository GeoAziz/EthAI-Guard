import os
import json
import hashlib
import pickle
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from pathlib import Path

logger = logging.getLogger('ai_core.retraining.registry')

class ModelRegistry:
    """
    Local model versioning and registry system.
    Stores model metadata and versions locally for retraining workflows.
    """

    def __init__(self, base_path: str = '/tmp/model_registry'):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
        self.models_dir = self.base_path / 'models'
        self.metadata_dir = self.base_path / 'metadata'
        self.models_dir.mkdir(exist_ok=True)
        self.metadata_dir.mkdir(exist_ok=True)
        logger.info({'msg': 'model_registry_initialized', 'base_path': str(self.base_path)})

    def generate_model_hash(self, model) -> str:
        try:
            return hashlib.sha256(pickle.dumps(model)).hexdigest()
        except Exception:
            return hashlib.sha256(str(model).encode()).hexdigest()

    def save_model_version(self, version: str, model, metadata: Dict[str, Any]) -> str:
        try:
            model_path = self.models_dir / f'{version}.pkl'
            metadata_path = self.metadata_dir / f'{version}.json'

            with open(model_path, 'wb') as f:
                pickle.dump(model, f)

            model_hash = self.generate_model_hash(model)
            meta = {
                'version': version,
                'model_hash': model_hash,
                'saved_at': datetime.utcnow().isoformat(),
                'model_type': type(model).__name__,
                **metadata,
            }

            with open(metadata_path, 'w') as f:
                json.dump(meta, f, indent=2, default=str)

            logger.info({
                'msg': 'model_version_saved',
                'version': version,
                'model_hash': model_hash,
                'path': str(model_path),
            })
            return model_hash
        except Exception as e:
            logger.error({'err': str(e), 'msg': 'failed_to_save_model_version', 'version': version})
            raise

    def load_model_version(self, version: str):
        try:
            model_path = self.models_dir / f'{version}.pkl'
            if not model_path.exists():
                raise FileNotFoundError(f'Model version {version} not found')

            with open(model_path, 'rb') as f:
                model = pickle.load(f)

            logger.info({'msg': 'model_version_loaded', 'version': version})
            return model
        except Exception as e:
            logger.error({'err': str(e), 'msg': 'failed_to_load_model_version', 'version': version})
            raise

    def get_model_metadata(self, version: str) -> Optional[Dict[str, Any]]:
        try:
            metadata_path = self.metadata_dir / f'{version}.json'
            if not metadata_path.exists():
                return None

            with open(metadata_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error({'err': str(e), 'msg': 'failed_to_get_model_metadata', 'version': version})
            return None

    def list_model_versions(self, limit: int = 50) -> list:
        try:
            versions = []
            for meta_file in sorted(self.metadata_dir.glob('*.json'), reverse=True)[:limit]:
                try:
                    with open(meta_file, 'r') as f:
                        versions.append(json.load(f))
                except Exception:
                    continue
            return versions
        except Exception as e:
            logger.error({'err': str(e), 'msg': 'failed_to_list_model_versions'})
            return []

    def delete_model_version(self, version: str) -> bool:
        try:
            model_path = self.models_dir / f'{version}.pkl'
            metadata_path = self.metadata_dir / f'{version}.json'

            if model_path.exists():
                model_path.unlink()
            if metadata_path.exists():
                metadata_path.unlink()

            logger.info({'msg': 'model_version_deleted', 'version': version})
            return True
        except Exception as e:
            logger.error({'err': str(e), 'msg': 'failed_to_delete_model_version', 'version': version})
            return False

    def get_latest_version(self) -> Optional[str]:
        try:
            versions = self.list_model_versions(limit=1)
            if versions:
                return versions[0].get('version')
            return None
        except Exception as e:
            logger.error({'err': str(e), 'msg': 'failed_to_get_latest_version'})
            return None
