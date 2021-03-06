'use strict';

var $ = require('jquery');

var Select3 = require('./select3-base');
var Select3Multiple = require('./select3-multiple');

var setOptions = Select3Multiple.prototype.setOptions;

function defaultTokenizer(input, selection, createToken, options) {

    var createTokenItem = options.createTokenItem || function(token) {
        return token ? { id: token, text: token } : null;
    };

    var separators = options.tokenSeparators;

    function hasToken(input) {
        return input ? separators.some(function(separator) {
            return input.indexOf(separator) > -1;
        }) : false;
    }

    function takeToken(input) {
        for (var i = 0, length = input.length; i < length; i++) {
            if (separators.indexOf(input[i]) > -1) {
                return { term: input.slice(0, i), input: input.slice(i + 1) };
            }
        }
        return {};
    }

    while (hasToken(input)) {
        var token = takeToken(input);
        if (token.term) {
            var item = createTokenItem(token.term);
            if (item && !Select3.findById(selection, item.id)) {
                createToken(item);
            }
        }
        input = token.input;
    }

    return input;
}

/**
 * Extends Select3Multiple.setOptions() with a default tokenizer which is used when the
 * tokenSeparators option is specified.
 *
 * @param options Options object. In addition to the options supported in the multi-input
 *                implementation, this may contain the following property:
 *                tokenSeparators - Array of string separators which are used to separate the search
 *                                  string into tokens. If specified and the tokenizer property is
 *                                  not set, the tokenizer property will be set to a function which
 *                                  splits the search term into tokens separated by any of the given
 *                                  separators. The tokens will be converted into selectable items
 *                                  using the 'createTokenItem' function. The default tokenizer also
 *                                  filters out already selected items.
 */
Select3Multiple.prototype.setOptions = function(options) {

    options = options || {};

    if (options.tokenSeparators) {
        if ($.type(options.tokenSeparators) === 'array') {
            options.tokenizer = options.tokenizer || defaultTokenizer;
        } else {
            throw new Error('tokenSeparators must be an array');
        }
    }

    setOptions.call(this, options);
};
