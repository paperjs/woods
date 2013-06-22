Woods
=====

a Node.js file based CMS inspired by [Kirby](http://getkirby.com/) & [Stacey](http://www.staceyapp.com/).

Please note: early days yet, expect things to be broken. Happy to receive your feedback.

### Features

*   No database
*   Tree structure with parents and children defined by files and directories in your site directory
*   Markdown content files where any new line starting with 'propertyname:' defines a property on the page
*   Listens to file-system changes and rebuilds the site if needed
*   [Live Reload](https://chrome.google.com/webstore/detail/livereload/jnihajbhpnppcggbcgedagnkighmdlei): Automatically reloads the browser whenever you edit a content file, static asset or template
*   Page type specific Jade templates
*   Thumbnails: resizing, max width/height, cropping
*   Pagination
*   Express web server for local testing or actual serving of content
*   Sync site to S3 bucket
*	Export site to directory

### Todo

*   Tests
*   FTP syncing

### Requirements

Woods requires Graphics Magick to be installed on your system: http://www.graphicsmagick.org/

### Installation

    npm install woods -g
    woods

Then point your browser to: 
[http://localhost:3000/](http://localhost:3000/)

### Usage

    Usage: woods [directory]
    
    Options:
    
      -h, --help                output usage information
      -V, --version             output the version number
      -p, --port [3000]         The server port
      -s, --sync                Sync site to s3
      -e, --export [directory]  Export site to directory

(Don't forget to turn on your [Live Reload plugin](https://chrome.google.com/webstore/detail/livereload/jnihajbhpnppcggbcgedagnkighmdlei) while editing)

We promise to make a better sample site soon. : )
