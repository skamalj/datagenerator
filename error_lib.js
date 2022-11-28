class InvalidRecordName extends Error {
    constructor (message) {
        super('INVALID RECORD NAME');
        this.code = 'INVALID RECORD NAME'
        this.statusCode = 400
        this.message = message
    }
}

class InvalidRecordSchema extends Error {
    constructor (message) {
        super('INVALID_RECORD_SCHEMA');
        this.code = 'INVALID_RECORD_SCHEMA';
        this.statusCode = 400
        this.message = message
    }
}

class SchemaNotFound extends Error {
    constructor (message) {
        super('SCHEMA_NOT_FOUND')
        this.code = "SCHEMA_NOT_FOUND"
        this.statusCode = 404
        this.message = message
    }
}

module.exports = {
    InvalidRecordName,
    InvalidRecordSchema,
    SchemaNotFound
}