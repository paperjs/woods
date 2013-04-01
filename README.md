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
*   Type based Jade templates
*   Uses Express to serve content locally on localhost:3000
*   Reloads automatically whenever a content or template file is changed
*   Page type specific Jade templates
*   NoDB

Todo:

*   Make non blocking (search for 'Sync')
*   Reload the page automatically when Woods is reloaded
*   Actually export files
*   S3 upload
*   Custom tags (using [Cheerio](https://github.com/MatthewMueller/cheerio)?)
*   Thumbnails
