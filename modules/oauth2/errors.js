import {DataError} from '@themost/common/errors';

export class OutdatedDataError extends DataError {
    /**
     * @param {string=} code
     * @param {string=} message
     * @param {string=} innerMessage
     */
    constructor(code, message, innerMessage) {
        super(code || 'EREQ', message || 'Your request contains invalid or outdated data. Please try again or contact to system administrator.', innerMessage);
        this.statusCode = 400;
    }
}

export class IdentityServerError extends DataError {
    /**
     * @param {string=} code
     * @param {string=} message
     * @param {string=} innerMessage
     */
    constructor(code, message, innerMessage) {
        super(code || 'EREQ', message || 'Login failed due to identity server error. Please try again or contact to system administrator.', innerMessage);
        this.statusCode = 500;
    }
}

export class ValidateCredentialsError extends DataError {
    /**
     * @param {string=} code
     * @param {string=} message
     * @param {string=} innerMessage
     */
    constructor(code, message, innerMessage) {
        super(code || 'ECREDS', message || 'An error occurred while validating your credentials. Please try again or contact to system administrator.', innerMessage);
        this.statusCode = 401;
    }
}

export class UnknownUsernameOrPasswordError extends DataError {
    /**
     * @param {string} username
     * @param {string=} code
     * @param {string=} message
     * @param {string=} innerMessage
     */
    constructor(username, code, message, innerMessage) {
        super(code || 'ECREDS', message || 'Unknown username or bad password. Please try again.', innerMessage);
        this.username = username;
        this.statusCode = 401;
    }
}

export class LoginServerError extends DataError {
    /**
     * @param {string} username
     * @param {string=} code
     * @param {string=} message
     * @param {string=} innerMessage
     */
    constructor(username, code, message, innerMessage) {
        super(code || 'ESERVER', message || 'An internal server error occurred. Please try again or contact to system administrator.', innerMessage);
        this.username = username;
        this.statusCode = 500;
    }
}

export class InvalidDataError extends DataError {
    /**
     * @param {string=} code
     * @param {string=} message
     * @param {string=} innerMessage
     */
    constructor(code, message, innerMessage) {
        super(code || 'EREQ', message || 'Something went wrong with your request. The data may be invalid or you reached this page with invalid parameters.', innerMessage);
        this.statusCode = 400;
    }
}
