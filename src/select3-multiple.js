'use strict';

var $ = require('jquery');

var Select3 = require('./select3-base');

var KEY_BACKSPACE = 8;
var KEY_DELETE = 46;
var KEY_ENTER = 13;

/**
 * MultipleSelect3 Constructor.
 *
 * @param options Options object. Accepts all options from the Select3 Base Constructor in addition
 *                to those accepted by MultipleSelect3.setOptions().
 */
function MultipleSelect3(options) {

    Select3.call(this, options);

    this.$el.html(this.template('multipleSelectInput'));

    this._highlightedItemId = null;

    this.initSearchInput(this.$('.select3-multiple-input:not(.select3-width-detector)'));

    this._rerenderSelection();
}

MultipleSelect3.prototype = Object.create(Select3.prototype);
MultipleSelect3.prototype.constructor = MultipleSelect3;

/**
 * Methods.
 */
$.extend(MultipleSelect3.prototype, {

    /**
     * Adds an item to the selection, if it's not selected yet.
     *
     * @param item The item to add. May be an item with 'id' and 'text' properties or just an ID.
     */
    add: function(item) {

        if (Select3.isValidId(item)) {
            if (this._value.indexOf(item) === -1) {
                this._value.push(item);

                if (this.options.initSelection) {
                    this.options.initSelection([item], function(data) {
                        if (this._value.lastIndexOf(item) > -1) {
                            item = this.validateItem(data[0]);
                            this._data.push(item);

                            this.triggerChange({ added: item });
                        }
                    }.bind(this));
                } else {
                    item = this.getItemForId(item);
                    this._data.push(item);

                    this.triggerChange({ added: item });
                }
            }
        } else {
            item = this.validateItem(item);
            if (this._value.indexOf(item.id) === -1) {
                this._data.push(item);
                this._value.push(item.id);

                this.triggerChange({ added: item });
            }
        }

        this.$searchInput.val('');
    },

    /**
     * Events map.
     *
     * Follows the same format as Backbone: http://backbonejs.org/#View-delegateEvents
     */
    events: {
        'change': '_rerenderSelection',
        'change .select3-multiple-input': function() { return false; },
        'click': '_clicked',
        'click .select3-multiple-selected-item-remove': '_itemRemoveClicked',
        'click .select3-multiple-selected-item': '_itemClicked',
        'keydown .select3-multiple-input': '_keyHeld',
        'keyup .select3-multiple-input': '_keyReleased',
        'paste .select3-multiple-input': function() {
            setTimeout(this.search.bind(this), 10);
        },
        'select3-selected': '_resultSelected'
    },

    /**
     * @inherit
     */
    filterResults: function(results) {

        return results.filter(function(item) {
            return !Select3.findById(this._data, item.id);
        }, this);
    },

    /**
     * Returns the correct data for a given value.
     *
     * @param value The value to get the data for. Should be an array of IDs.
     *
     * @return The corresponding data. Will be an array of objects with 'id' and 'text' properties.
     *         Note that if no items are defined, this method assumes the text labels will be equal
     *         to the IDs.
     */
    getDataForValue: function(value) {

        return value.map(this.getItemForId.bind(this)).filter(function(item) { return !!item; });
    },

    /**
     * Returns the correct value for the given data.
     *
     * @param data The data to get the value for. Should be an array of objects with 'id' and 'text'
     *             properties.
     *
     * @return The corresponding value. Will be an array of IDs.
     */
    getValueForData: function(data) {

        return data.map(function(item) { return item.id; });
    },

    /**
     * Removes an item from the selection, if it is selected.
     *
     * @param item The item to remove. May be an item with 'id' and 'text' properties or just an ID.
     */
    remove: function(item) {

        var id = ($.type(item) === 'object' ? item.id : item);

        var removedItem;
        var index = Select3.findIndexById(this._data, id);
        if (index > -1) {
            removedItem = this._data[index];
            this._data.splice(index, 1);
        }

        if (this._value[index] !== id) {
            index = this._value.indexOf(id);
        }
        if (index > -1) {
            this._value.splice(index, 1);
        }

        if (removedItem) {
            this.triggerChange({ removed: removedItem });
        }

        if (id === this._highlightedItemId) {
            this._highlightedItemId = null;
        }
    },

    /**
     * @inherit
     */
    search: function() {

        var term = this.$searchInput.val();

        if (this.options.tokenizer) {
            term = this.options.tokenizer(term, this._data, this.add.bind(this), this.options);

            if ($.type(term) === 'string') {
                this.$searchInput.val(term);
            } else {
                term = '';
            }
        }

        if (this.dropdown) {
            Select3.prototype.search.apply(this);
        }
    },

    /**
     * @inherit
     *
     * @param options Options object. In addition to the options supported in the base
     *                implementation, this may contain the following properties:
     *                backspaceHighlightsBeforeDelete - If set to true, when the user enters a
     *                                                  backspace while there is no text in the
     *                                                  search field but there are selected items,
     *                                                  the last selected item will be highlighted
     *                                                  and when a second backspace is entered the
     *                                                  item is deleted. If false, the item gets
     *                                                  deleted on the first backspace. The default
     *                                                  value is true on devices that have touch
     *                                                  input and false on devices that don't.
     *                createTokenItem - Function to create a new item from a user's search term.
     *                                  This is used to turn the term into an item when dropdowns
     *                                  are disabled and the user presses Enter. It is also used by
     *                                  the default tokenizer to create items for individual tokens.
     *                                  The function receives a 'token' parameter which is the
     *                                  search term (or part of a search term) to create an item for
     *                                  and must return an item object with 'id' and 'text'
     *                                  properties or null if no token can be created from the term.
     *                                  The default is a function that returns an item where the id
     *                                  and text both match the token for any non-empty string and
     *                                  which returns null otherwise.
     *                tokenizer - Function for tokenizing search terms. Will receive the following
     *                            parameters:
     *                            input - The input string to tokenize.
     *                            selection - The current selection data.
     *                            createToken - Callback to create a token from the search terms.
     *                                          Should be passed an item object with 'id' and 'text'
     *                                          properties.
     *                            options - The options set on the Select3 instance.
     *                            Any string returned by the tokenizer function is treated as the
     *                            remainder of untokenized input.
     */
    setOptions: function(options) {

        options = options || {};

        var backspaceHighlightsBeforeDelete = 'backspaceHighlightsBeforeDelete';
        if (options[backspaceHighlightsBeforeDelete] === undefined) {
            options[backspaceHighlightsBeforeDelete] = this.hasTouch;
        }

        options.allowedTypes = options.allowedTypes || {};
        options.allowedTypes[backspaceHighlightsBeforeDelete] = 'boolean';

        Select3.prototype.setOptions.call(this, options);
    },

    /**
     * Validates data to set. Throws an exception if the data is invalid.
     *
     * @param data The data to validate. Should be an array of objects with 'id' and 'text'
     *             properties.
     *
     * @return The validated data. This may differ from the input data.
     */
    validateData: function(data) {

        if (data === null) {
            return [];
        } else if ($.type(data) === 'array') {
            return data.map(this.validateItem.bind(this));
        } else {
            throw new Error('Data for MultiSelect3 instance should be array');
        }
    },

    /**
     * Validates a value to set. Throws an exception if the value is invalid.
     *
     * @param value The value to validate. Should be an array of IDs.
     *
     * @return The validated value. This may differ from the input value.
     */
    validateValue: function(value) {

        if (value === null) {
            return [];
        } else if ($.type(value) === 'array') {
            if (value.every(Select3.isValidId)) {
                return value;
            } else {
                throw new Error('Value contains invalid IDs');
            }
        } else {
            throw new Error('Value for MultiSelect3 instance should be an array');
        }
    },

    /**
     * @private
     */
    _backspacePressed: function() {

        if (this.options.backspaceHighlightsBeforeDelete) {
            if (this._highlightedItemId) {
                this._deletePressed();
            } else if (this._value.length) {
                this._highlightItem(this._value.slice(-1)[0]);
            }
        } else if (this._value.length) {
            this.remove(this._value.slice(-1)[0]);
        }
    },

    /**
     * @private
     */
    _clicked: function() {

        this.focus();

        this._open();

        return false;
    },

    /**
     * @private
     */
    _createToken: function() {

        var term = this.$searchInput.val();

        if (term && this.options.createTokenItem) {
            var item = this.options.createTokenItem(term);
            if (item) {
                this.add(item);
            }
        }
    },

    /**
     * @private
     */
    _deletePressed: function() {

        if (this._highlightedItemId) {
            this.remove(this._highlightedItemId);
        }
    },

    /**
     * @private
     */
    _highlightItem: function(id) {

        this._highlightedItemId = id;
        this.$('.select3-multiple-selected-item').removeClass('highlighted')
            .filter('[data-item-id=' + Select3.quoteCssAttr(id) + ']').addClass('highlighted');

        if (this.hasKeyboard) {
            this.focus();
        }
    },

    /**
     * @private
     */
    _itemClicked: function(event) {

        this._highlightItem(this._getItemId(event));
    },

    /**
     * @private
     */
    _itemRemoveClicked: function(event) {

        this.remove(this._getItemId(event));

        this._updateInputWidth();

        return false;
    },

    /**
     * @private
     */
    _keyHeld: function() {

        this._originalValue = this.$searchInput.val();
    },

    /**
     * @private
     */
    _keyReleased: function(event) {

        var inputHadText = !!this._originalValue;

        if (event.keyCode === KEY_ENTER && !event.ctrlKey) {
            if (this.options.createTokenItem) {
                this._createToken();
            }
        } else if (event.keyCode === KEY_BACKSPACE && !inputHadText) {
            this._backspacePressed();
        } else if (event.keyCode === KEY_DELETE && !inputHadText) {
            this._deletePressed();
        }
    },

    /**
     * @private
     */
    _open: function() {

        if (this.options.showDropdown !== false) {
            this.open();
        }
    },

    /**
     * @private
     */
    _rerenderSelection: function(event) {

        event = event || {};

        var $input = this.$searchInput;
        if (event.added) {
            $input.before(this.template('multipleSelectedItem', $.extend({
                highlighted: (event.added.id === this._highlightedItemId)
            }, event.added)));

            this._scrollToBottom();
        } else if (event.removed) {
            var quotedId = Select3.quoteCssAttr(event.removed.id);
            this.$('.select3-multiple-selected-item[data-item-id=' + quotedId + ']').remove();
        } else {
            this.$('.select3-multiple-selected-item').remove();

            this._data.forEach(function(item) {
                $input.before(this.template('multipleSelectedItem', $.extend({
                    highlighted: (item.id === this._highlightedItemId)
                }, item)));
            }, this);

            this._updateInputWidth();
        }

        if (event.added || event.removed) {
            if (this.dropdown) {
                this.dropdown.showResults(this.filterResults(this.results), {
                    hasMore: this.dropdown.hasMore
                });
            }

            if (this.hasKeyboard) {
                this.focus();
            }
        }

        this.positionDropdown();

        $input.attr('placeholder', this._data.length ? '' : this.options.placeholder);
    },

    /**
     * @private
     */
    _resultSelected: function(event) {

        if (this._value.indexOf(event.id) === -1) {
            this.add(event.item);
        } else {
            this.remove(event.item);
        }
    },

    /**
     * @private
     */
    _scrollToBottom: function() {

        var $inputContainer = this.$('.select3-multiple-input-container');
        $inputContainer.scrollTop($inputContainer.height());
    },

    /**
     * @private
     */
    _updateInputWidth: function() {

        var $input = this.$searchInput, $widthDetector = this.$('.select3-width-detector');
        $widthDetector.text($input.val() || !this._data.length && this.options.placeholder || '');
        $input.width($widthDetector.width() + 20);

        this.positionDropdown();
    }

});

Select3.InputTypes.Multiple = MultipleSelect3;

module.exports = MultipleSelect3;
