const REF_SCHEMA = {
    "id": "/RefRecord",
    "type": "object",
    "additionalProperties": false,
    "patternProperties": {
        "^[a-zA-Z]*$": {
            "type": "object",
            "required": ["schema"],
            "additionalProperties": false,
            "properties": {
                "count": { "type": "integer" },
                "schema": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["name", "namespace", "function"],
                        "additionalProperties": false,
                        "properties": {
                            "name": { "type": "string" },
                            "namespace": { "type": "string" },
                            "function": { "type": "string" },
                            "unique": { "type": "boolean" },
                            "args": {
                                "type": "array",
                                "items": { 
                                    "type": "object",
                                    "additionalProperties": true
                                }
                            },
                        }
                    }
                }
            }
        }
    }
}

const SOURCE_SCHEMA = {
    "id": "/SourceRecord",
    "type": "object",
    "required": ["Source"],
    "additionalProperties": false,
    "Properties": {
        "Source": {
            "type": "object",
            "required": ["count", "schema"],
            "properties": {
                "count": { "type": "integer" },
                "failure_simulation": {
                    "type": "object",
                    "required": ["probability", "min_source_recs"],
                    "additionalProperties": false,
                    "properties": {
                        "probability": {"type": "float"},
                        "min_source_recs": {"type": "integer"},
                    }
                },
                "schema": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["name", "namespace", "function"],
                        "additionalProperties": false,
                        "properties": {
                            "name": { "type": "string" },
                            "namespace": { "type": "string" },
                            "function": { "type": "string" },
                            "unique": { "type": "boolean" },
                            "args": {
                                "type": "array",
                                "items": { 
                                    "type": "object",
                                    "additionalProperties": true
                                }
                            },
                        }
                    }
                }
            }
        }
    }
}

const MASTER_SCHEMA = {
    "id": "/MasterRecord",
    "type": "object",
    "required": ["Master"],
    "additionalProperties": false,
    "Properties": {
        "Master": {
            "type": "object",
            "required": ["schema"],
            "additionalProperties": false,
            "properties": {
                "schema": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["name", "namespace", "function"],
                        "additionalProperties": false,
                        "properties": {
                            "name": { "type": "string" },
                            "namespace": { "type": "string" },
                            "function": { "type": "string" },
                            "args": {
                                "type": "array",
                                "items": { 
                                    "type": "object",
                                    "additionalProperties": true
                                }
                            },
                            "anomaly": {
                                "type": "object",
                                "additionalProperties": false,
                                "properties": {
                                    "magnitude": { "type": "number" },
                                    "frequency": { "type": "integer" },
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

module.exports = { SOURCE_SCHEMA, REF_SCHEMA, MASTER_SCHEMA }
