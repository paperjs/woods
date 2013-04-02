Woods
=====

a Node.js file based CMS inspired by [Kirby](http://getkirby.com/) & [Stacey](http://www.staceyapp.com/).

Please note: early days yet, expect things to be broken. Happy to receive your feedback.

Terminology:

*   A Tree is a site (Do we even need multiple sites? Hm.)
*   A Branch is a page, which can contain other Branches
*   Leaves are fields taken from Markdown files with optional parse functions

Features:

*   DOM like structure with parents and children
*   Uses Express to serve content locally on localhost:3000
*   Reloads automatically whenever a content or template file is changed
*   Page type specific Jade templates
*   NoDB

Todo:

*   Make a relatively decent example site
*   Make non blocking (search for 'Sync')
*   Decide if we need to make this less memory hungry.
*   Live Reload: Reload the browser when Woods is reloaded
*   Actually export files
*   S3 upload
*   Custom tags (using [Cheerio](https://github.com/MatthewMueller/cheerio)?)
*   Thumbnails
*   Tests

Install:

    npm install woods
    cd woods
    node ./

Then point your browser to:

[http://localhost:3000/example.dev/](http://localhost:3000/example.dev/)

We promise to make a better sample site soon. : )
