class ErrorHandler {

    constructor(status, message) {
        this.status = status;
        this.message = message;
    }

    // 
    static notFoundError(message = 'Not found!') {
        return new ErrorHandler(404, message);
    }

    static forbidden(message = 'User not allowed!') {
        return new ErrorHandler(403, message);
    }

    static validationError(message = "All fields are required!") {
        return new ErrorHandler(422, message)
    }

    static serverError(message = 'Internal error') {
        return new ErrorHandler(500, message);
    }

}

module.exports = ErrorHandler;