# Upgrading the Dropbox SDK

This document is designed to show you how to upgrade to the latest version of the SDK accomodating any breaking changes introduced by major version updates.  If you find any issues with either this guide on upgrading or the changes introduced in the new version, please see [CONTRIBUTING.md][contributing]

# Upgrading from v5.X.X to v6.0.0

## 1. Unifying Dropbox and DropboxTeam

We made the decision to unify the Dropbox and DropboxTeam objects to further simplify the logic in the SDK.  Migrating is very straightforward, a reference like this:

```
var dbx = new DropboxTeam({
    accessToken: 'my_token'
});
```

Can be rewritten as:

```
var dbx = new Dropbox({
    accessToken: 'my_token'
});
```

Additionally, when using features like assume user, select admin, or path root they are not set as a part of the constructor rather than creating a new client. Logic like this:

```
var dbx = new DropboxTeam({
    accessToken: 'my_token'
});
var dbx_user = dbx.actAsUser(user_id);
dbx_user.usersGetCurrentAccount();
```

Can be rewritten as:

```
var dbx = new Dropbox({
    accessToken: 'my_token'
    selectUser: 'my_user_id'
});
dbx.usersGetcurrentAccount();
```

## 2. Moving authentication to DropboxAuth

Another change that was made was to move all auth related functionality into the DropboxAuth object. The main Dropbox object can be constructed the same way but this will internally create a DropboxAuth object.  In order to access any auth functions from the main client you must change your code as such:

```
dbx.get_authentication_url(...);
```

Would become something like this:

```
dbx.auth.get_authentication_url(...);
```

However, we recommend creating a DropboxAuth object before creating a client and then constructing as such:

```
var dbxAuth = new DropboxAuth();
... // Do auth logic
var dbx = new Dropbox(dbxAuth);
```

That way if you need to create another instance of the client, you can easily plug in the same auth object.

## 3. Changing Typescript export format

We have updated the Typescript definitions to be a part of `Dropbox` namespace rather than the `DropboxTypes` namespace.  This would look like:

```
const result: DropboxTypes.users.FullAccount dbx.usersGetCurrentAccount();
```

Would become:

```
const result: Dropbox.users.FullAccount dbx.usersGetCurrentAccount();
```

[contributing]: https://github.com/dropbox/dropbox-sdk-js/blob/master/CONTRIBUTING.md