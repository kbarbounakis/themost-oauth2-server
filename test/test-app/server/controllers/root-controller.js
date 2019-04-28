
import HttpBaseController from '@themost/web/controllers/base';
import {httpController,httpGet,httpAction} from '@themost/web/decorators';

@httpController()
class RootController extends HttpBaseController {
    
    constructor(context) {
        super(context);
    }
    
    @httpGet()
    @httpAction('index')
    async getIndex() {
        return this.view();
    }
    
}

module.exports = RootController;