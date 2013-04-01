Woods
=====

a Node.js based static site generator inspired by [Kirby](http://getkirby.com/) & [Stacey](http://www.staceyapp.com/).

Note: early days yet. Happy to receive your feedback.

Terminology:

*   A Tree is a site (Do we need multiple sites? Hm.)
*   A Branch is a page, which can contain other Branches
*   Leaves are fields taken from Markdown files with optional parse functions

Features:

*   DOM like structure with parents and children
*   Uses express to serve locally on localhost:3000
*   Reloads automatically whenever a content or template file is changed
*   Jade templates

Todo:

*   Reload the page automatically when Woods is reloaded
*   Export files
*   S3 upload
*   Custom tags
*   Thumbnails
