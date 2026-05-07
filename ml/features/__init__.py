try:
    from ml.features.feature_extractor import (
        CATEGORY_TO_ID,
        CATEGORY_PROPERTIES,
        extract_item_aux,
        extract_pair_aux_from_rule,
        validate_aux_vectors,
        validate_dataset,
        get_default_item_aux,
        AUX_DIM,
        METADATA_FIELDS_REQUIRED,
        CATEGORY_GROUPS,
    )
except ImportError:
    from .feature_extractor import (
        CATEGORY_TO_ID,
        CATEGORY_PROPERTIES,
        extract_item_aux,
        extract_pair_aux_from_rule,
        validate_aux_vectors,
        validate_dataset,
        get_default_item_aux,
        AUX_DIM,
        METADATA_FIELDS_REQUIRED,
        CATEGORY_GROUPS,
    )

__all__ = [
    "CATEGORY_TO_ID",
    "CATEGORY_PROPERTIES",
    "extract_item_aux",
    "extract_pair_aux_from_rule",
    "validate_aux_vectors",
    "validate_dataset",
    "get_default_item_aux",
    "AUX_DIM",
    "METADATA_FIELDS_REQUIRED",
    "CATEGORY_GROUPS",
]
