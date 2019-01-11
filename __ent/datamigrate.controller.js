function createSchema(app, mssql, pool2) {

    var ActiveDirectory = require('activedirectory');
    var adConfig = {
        url: 'ldap://ics.global',
        baseDN: 'dc=ics,dc=global'
    }

    app.get('/api/getADUsers', (req, res) => {
        var query = {
            filter: '(&(objectCategory=person)(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2))(givenName=*))',
            attributes: ['mail',
                'userPrinicipalName',
                'st',
                'l',
                'department',
                'company',
                'title',
                'co',
                'telephoneNumber',
                'employeeNumber',
                'mobile',
                'sAMAccountName',
                'givenName',
                'displayName',
                'picture',
                'sn',
                'dn']
        }
        adConfig.username="sbhoybar@ics.global";
        adConfig.password="shriniwas@456";
        var ad = new ActiveDirectory(adConfig);
        ad.findUsers(query, true, function (err, users) {
            if (err) {
                console.log('ERROR: ' + JSON.stringify(err));
                res.send({ message: err, success: false });
                return;
            }
            if ((!users) || (users.length == 0)) {
                console.log('No users found.');
                res.send({ message: 'No users found.', success: false });
            }
            else {
                res.send({ message: "User List retrieved successfully!", success: true, response: users });
            }
        });

    })
   
}
module.exports.loadSchema = createSchema;