export default class UnauthorizedException extends Error{
    status: number;
    
    constructor(message: string){
        super(message)
        Error.captureStackTrace(this, this.constructor);

        this.name = this.constructor.name;
        this.status = 401;
    }

    statusCode(){
        return this.status;
    }
} 