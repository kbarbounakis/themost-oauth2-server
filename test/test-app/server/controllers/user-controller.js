import DataController from './data-controller';
import {httpController,httpGet, httpAction} from '@themost/web/decorators';

@httpController()
class UserController extends DataController {
    
    constructor(context) {
        super(context);
    }
    
    @httpGet()
    @httpAction('me')
    async getMe() {
        return await this.context.model('User').where('name').equal(this.context.user.name).getItem();
    }
    
}

module.exports = UserController;