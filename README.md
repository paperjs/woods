Woods
=====

a Node.js file based CMS inspired by [Kirby](http://getkirby.com/) & [Stacey](http://www.staceyapp.com/).

Please note: early days yet, expect things to be broken. Happy to receive your feedback.

Features:

*   Tree structure with parents and children
*   Uses Express to serve content locally on localhost:3000
*   Basic [Live Reload](https://chrome.google.com/webstore/detail/livereload/jnihajbhpnppcggbcgedagnkighmdlei) support: Reloads the browser whenever you edit a file
*   Page type specific Jade templates
*   NoDB

Todo:

*   Make a relatively decent example site
*   Decide if we need to make this less memory hungry.
*   Actually export files
*   S3 upload
*   Custom tags (using [Cheerio](https://github.com/MatthewMueller/cheerio)?)
*   Thumbnails
*   Tests

Install:

    npm install woods
    cd node_modules/woods
    node ./

Then point your browser to:

[http://localhost:3000/example.dev/](http://localhost:3000/example.dev/)

(Don't forget to turn on your [Live Reload plugin](https://chrome.google.com/webstore/detail/livereload/jnihajbhpnppcggbcgedagnkighmdlei) while editing)

We promise to make a better sample site soon. : )
