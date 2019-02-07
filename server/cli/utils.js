import prompt from 'prompt';

export function finalize(context) {
    return new Promise((resolve) => {
        if (context) {
            return context.finalize(()=> {
                return resolve();
            });
        }
        return resolve();
    });
}

/**
 * @returns {HttpApplication}
 */
export function getApplication() {
    // get application
    return require('../server');
}

export function proceed(message) {
    return new Promise((resolve, reject) => {
        prompt.start();
        prompt.get({
            name: 'yesno',
            message: (message || 'Do you want to proceed?') + ' (y/n)',
            validator: /y[es]*|n[o]?/,
            warning: 'Must respond yes or no',
            default: 'no'
        }, (err, respond) => {
            if (err) {
                return reject(err);
            }
            return resolve((respond.yesno === 'y'));
        });
    });
}

export function password() {
    return new Promise(function (resolve, reject) {
        // show password hint
        console.log("Hint: The new password should have at least 8 characters and should contain at least one digit, one lowercase and one uppercase character. The new password may also contain one or more special characters #,$,^,+,=,!,*,(,),@,%,&");
        prompt.start();
        prompt.get([{
            name: 'password',
            pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[#$^+=!*()@%&]).{8,}$/,
            message: 'Type user password',
            required: true,
            hidden: true
        },{
            name: 'confirmPassword',
            pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[#$^+=!*()@%&]).{8,}$/,
            message: 'Confirm user password',
            required: true,
            hidden: true
        }], (err, respond) => {
            if (err) {
                return reject(err);
            }
            if (respond.password !== respond.confirmPassword) {
                return reject(new Error('Password and confirm password does not match.'));
            }
            return resolve(respond.password);
        });
    });
}