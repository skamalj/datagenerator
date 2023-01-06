class InvalidRecordName extends Error {
    constructor (message) {
        super('INVALID RECORD NAME');
        this.code = 'INVALID RECORD NAME'
        this.statusCode = 400
        this.message = message
    }
}

class AlreadyExists extends Error {
    constructor (message) {
        super('Already exists');
        this.code = 'Record already exists'
        this.statusCode = 409
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

class NotFound extends Error {
    constructor (message) {
        super('NOT_FOUND');
        this.code = 'NOT_FOUND'
        this.statusCode = 404
        this.message = message
    }
}

module.exports = {
    InvalidRecordName,
    InvalidRecordSchema,
    SchemaNotFound,
    AlreadyExists,
    NotFound
}