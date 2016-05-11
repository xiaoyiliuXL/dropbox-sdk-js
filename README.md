# Dropbox API JavaScript Client

DropboxApi is lightweight JavaScript client that provides a promise based interface to the Dropbox v2 API that works in both nodejs and browser environments.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Examples](#examples)
- [Documentation](#documentation)
- [Contributing](#contributing)

## Installation

#### npm

Use [npm](https://www.npmjs.com/) for [nodejs](https://nodejs.org/en/), [webpack](https://github.com/webpack/webpack) or [browserify](http://browserify.org/):

```console
$ npm install @TODO --save
```

#### `<script>`

The UMD build is available on [npmcdn](https://npmcdn.com/):

```html
<script src="https://npmcdn.com/dropbox/@TODO.min.js"></script>
```

You can find the library on `window.DropboxApi`.

## Usage

#### Browser with `<script>`

```html
<script src="https://npmcdn.com/dropbox/@TODO.min.js"></script>
<script>
  var dbx = new DropboxApi({ accessToken: 'YOUR_ACCESS_TOKEN_HERE' });
  dbx.filesListFolder({path: '/'})
    .then(function(response) {
      console.log(response);
    })
    .catch(function(error) {
      console.log(error);
    });
</script>
```

#### Nodejs, Browserify or Webpack

```javascript
var DropboxApi = require('@TODO');
var dbx = new DropboxApi({ accessToken: 'YOUR_ACCESS_TOKEN_HERE' });
dbx.filesListFolder({path: '/'})
  .then(function(response) {
    console.log(response);
  })
  .catch(function(error) {
    console.log(error);
  });
```

## Examples

See [examples/](examples/) for working examples of how the client can be used in a few different environments.

## Documentation

#### Authentication

The Dropbox API uses [OAuth2](http://oauth.net/) for authorizing API requests. DropboxApi requires an access token to make authenticated requests. The access token can be supplied at instantiation or set later using the `setAccessToken()` method.

For more information on how to obtain an access token using OAuth, please see our [OAuth Guide](https://www.dropbox.com/developers/reference/oauth-guide).

@TODO: We need helpers, examples and more info here.

#### Endpoints

For documentation of all of the available endpoints, the parameters they receive and the data they return, see [src/routes.js](src/routes.js). These methods are all available directly from an instance of the API class, ex: `dbx.filesListFolder()`.

@TODO: Autogenerate docs from JSDocs in routes.js.

#### Promises implementation

The client returns Promises using the [native Promise implementation](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise) and polyfills with [jakearchibald/es6-promise](https://github.com/stefanpenner/es6-promise) when needed.

## Contributing

Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for information on how to contribute, setup the development environment and run tests.