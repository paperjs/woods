/*
 * paragraphs.js
 *
 * Copyright (c) 2008 - 2013, Juerg Lehni
 * http://lehni.org/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

var paragraphs = (function() {
'use strict';

// Converts string lists to a lookup table:
function lookup(list) {
	var lookup = {};
	list.split(',').forEach(function(entry) {
		lookup[entry] = true;
	});
	return lookup;
}

// Block tags are tags that require to be rendered outside of paragraphs.
var blockTags = lookup('address,dir,div,table,blockquote,center,dl,fieldset,'
		+ 'form,h1,h2,h3,h4,h5,h6,hr,isindex,ol,p,pre,ul,script,canvas,nav,'
		+ 'header,footer,aside,article,section,hgroup,figure,figcaption');

var emptyTags = lookup('area,base,basefont,br,col,frame,hr,img,input,isindex,'
		+ 'link,meta,param');

/**
 * Performs the following string manipulations:
 * Empty lines (double line breaks) are considered to indicate paragraphs,
 * which are surrounded with <p> tags, except for text content that follows
 * block tags on the same line, which is not wrapped in paragraphs.
 * All single line breaks are replaced with <br> tags, with the exception of
 * line breaks that follow block tags (table, div, h1, ..).
 */
return function paragraphs(str) {
	// Determine used lineBreak sequence and use it to break input into
	// lines. This is much faster than using the regexp directly in
	// split, which itself is still faster than finding lines using
	// indexOf. All in all this alone leads to a speed increase of * 2.
	var lineBreak = (str.match(/(\r\n|\n|\r)/) || [null, '\n'])[1];
	var lines = str.split(lineBreak);
	var isParagraph = false, wasParagraph = false;
	var isSuffix = false, wasSuffix = false;
	var out = [];
	var breakTag = '<br>';
	for (var i = 0, l = lines.length; i < l; i++, wasParagraph = isParagraph) {
		var line = lines[i];
		// console.log('#', i, '"' + line + '"');
		if (!line || /^\s*$/.test(line)) {
			if (isParagraph) {
				out.push(lineBreak, '</p>');
				isParagraph = false;
			} else if (wasSuffix) {
				// Only add one break on empty lines if the previous line
				// was a suffix. See bellow for explanations.
				out.push(breakTag);
			}
			continue;
		}
		wasSuffix = false;
		var match;
		// The beginning of a tag?
		if (match = line.match(/^<(\w*)/)) {
			var tag = match[1];
			var isBlockTag = blockTags[tag];
			if (isParagraph && isBlockTag) {
				out.push(lineBreak, '</p>');
				isParagraph = false;
				wasParagraph = false;
			} else if (!isParagraph && !isBlockTag && !isSuffix) {
				// console.log('Tag', tag);
				out.push(out.length > 0 ? lineBreak : '', '<p>');
				isParagraph = true;
			}
			if (isBlockTag && !emptyTags[tag]) {
				// if (report) console.log('Block Tag', tag);
				// Find the end of this outside tag. We need to count the
				// nesting of opening and closing tags in order to make sure
				// the whole block is detected.
				var open = '<' + tag;
				var close = '</' + tag + '>';
				// Start with nesting 1 and searchIndex after the tag
				// so the currently opening tag is already counted.
				var nesting = 1, searchIndex = open.length; 
				for (; i < l; i++) {
					line = lines[i];
					// console.log('Adding', line);
					// If the line is the rest of a previously processed
					// line (see bellow), do not add a newline before it.
					// This is crucual e.g. for rendering of inlined image
					// resources in Scriptographer .block .text.
					if (!isSuffix && i > 0)
						out.push(lineBreak);
					out.push(line);
					// console.log('Nesting', nesting, line);
					isSuffix = false;
					while (true) {
						var closeIndex = line.indexOf(close, searchIndex);
						var openIndex = line.indexOf(open, searchIndex);
						if (closeIndex != -1) {
							if (openIndex != -1) {
								if (closeIndex < openIndex) {
									// We're closing before opening again, reduce
									// nesting and see what is to be done after.
									nesting--;
									searchIndex = openIndex;
								} else {
									// Else we're opening a new one and closing it
									// again, so nesting stays the same.
									searchIndex = closeIndex + close.length;
								}
							} else {
								nesting--;
								searchIndex = closeIndex + close.length;
							}
							if (nesting === 0) {
								// console.log('Closed', line);
								isParagraph = false;
								var index = closeIndex + close.length;
								if (index < line.length) {
									// If there is more right after, put it back
									// into lines and reduce i by 1, so this line
									// will be iterated and processed again.
									// console.log('Suffix', line.substring(index));
									lines[i--] = line.substring(index);
									// Replace the full line with what has been
									// processed already.
									out[out.length - 1] = line.substring(0, index);
									// Mark this as a so called suffix, which is
									// a snippet of text that followed a block tag
									// on the same line. We don't want these to
									// be rendered in a new paragraph. Instead
									// it should just follow the block tag and
									// be terminated with a br tag. isSuffix handles
									// that. This might not be a suffix thought but
									// another block tag. The parsing of the line
									// that's been put back will tell...
									isSuffix = true;
								}
								break;
							}
						} else if (openIndex != -1) {
							nesting++;
							searchIndex = openIndex + open.length;
						} else {
							searchIndex = 0;
							break;
						}
					}
					if (nesting === 0)
						break;
				}
				continue;
			}
		} else if (!isParagraph && !isSuffix) {
			out.push(out.length > 0 ? lineBreak : '', '<p>');
			isParagraph = true;
		}
		// wasParagraph is used to know that we are on lines 2nd and
		// beyond within a paragraph, so we can add break tags.
		if (wasParagraph)
			out.push(breakTag);
		if (out.length > 0)
			out.push(lineBreak);
		out.push(line);
		// Suffixes are outside paragraphs and therefore need a
		// break after.
		if (isSuffix) {
			out.push(breakTag);
			wasSuffix = true;
			isSuffix = false;
		}
	}
	if (isParagraph) {
		out.push(lineBreak, '</p>');
	} else if (wasSuffix) {
		out.push(breakTag);
	}
	return out.join('');
};
})();

// Export paragraphs function for node
if (typeof module !== 'undefined')
	module.exports = paragraphs;
