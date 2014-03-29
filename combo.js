// -*- mode: js; js-indent-level: 4; indent-tabs-mode: nil -*-

const Lang = imports.lang;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Params = imports.misc.params;
const Signals = imports.signals;
const St = imports.gi.St;


function ComboBoxMenuItem(text) {
    this._init(text);
}

ComboBoxMenuItem.prototype = {
    __proto__: PopupMenu.PopupBaseMenuItem.prototype,
    
    _init: function(text) {
        PopupMenu.PopupBaseMenuItem.prototype._init.call(this, {style_class: "combobox-menu-item"});
        this.addActor(new St.Label({text: text, style_class: "combobox-menu-item-text"}));
    },
    
    activate: function() {
        this.emit("select", this);
    }
}


function ComboBoxSeparatorMenuItem() {
    this._init();
}

ComboBoxSeparatorMenuItem.prototype = {
    __proto__: PopupMenu.PopupSeparatorMenuItem.prototype,

    _init: function () {
        PopupMenu.PopupBaseMenuItem.prototype._init.call(this, { reactive: false, style_class: "" });
        
        this._drawingArea = new St.DrawingArea({ style_class: "combobox-separator" });
        this.addActor(this._drawingArea, { span: -1, expand: true });
        this._drawingArea.connect("repaint", Lang.bind(this, this._onRepaint));
    }
}


function ComboBoxMenu() {
    this._init.apply(this, arguments);
}

ComboBoxMenu.prototype = {
    __proto__: PopupMenu.PopupMenuBase.prototype,
    
    _init: function(sourceActor, params) {
        this.sourceActor = sourceActor;
        params = Params.parse(params, { 
                                        
                                      });
        PopupMenu.PopupMenuBase.prototype._init.call(this, sourceActor, "combo-box-menu");
        
        this.actor = new St.Bin({ x_fill: true, y_fill: true });
        this.actor._delegate = this;
        this.actor.add_actor(this.box);
        Main.uiGroup.add_actor(this.actor);
        global.focus_manager.add_group(this.actor);
        this.actor.hide();
    },
    
    addEntry: function(text) {
        let entry = new ComboBoxMenuItem(text);
        this.addMenuItem(entry);
        return entry;
    },
    
    addSeparator: function() {
        this.addMenuItem(new ComboBoxSeparatorMenuItem());
    },
    
    open: function(animate) {
        if (this.isOpen) return;
        this.isOpen = true;
        
        if (global.menuStackLength == undefined)
            global.menuStackLength = 0;
        global.menuStackLength += 1;
        
        this.actor.show();
        this.actor.raise_top();
        this.setPosition();
        
        this.emit('open-state-changed', true);
//global.log(String(this.actor.get_parent()));
    },
    
    close: function(animate) {
        if (!this.isOpen)
            return;
            
        this.isOpen = false;
        global.menuStackLength -= 1;
        
        this.actor.hide();
        
        this.emit('open-state-changed', false);
    },
    
    setPosition: function() {
        let [x, y] = this.sourceActor.get_transformed_position();
        let [w, h] = this.sourceActor.get_transformed_size();
        //let h = this.sourceActor.get_height();
        //let w = this.sourceActor.get_width();
        
        this.actor.x = x;
        this.actor.y = y + h;
        this.actor.width = w;
    }
}


function ComboBox(itemList, params) {
    this._init(itemList, params);
}

ComboBox.prototype = {
    _init: function(itemList, params) {
        params = Params.parse(params, { });
        
        //this.actor = new St.BoxLayout({style_class: "combobox-box"});
        
        this.actor = new St.Button({style_class: "combobox", x_expand: true, x_fill: true});
        
        this.selectedLabel = new St.Label({style_class: "combobox-label"});
        this.actor.add_actor(this.selectedLabel);
        
        this.actor.connect("button-press-event", Lang.bind(this, this.toggleMenu));
        
        this.menuManager = new PopupMenu.PopupMenuManager(this);
        this.menu = new ComboBoxMenu(this.actor);
        this.menuManager.addMenu(this.menu);
        
        if (itemList) {
            this.itemList = itemList;
            this.buildMenu();
        }
        else this.itemList = [];
    },
    
    toggleMenu: function() {
//try {
        this.menu.toggle();
//} catch(e) {
    //global.logError(e);
//}
    },
    
    setList: function(itemList) {
        this.itemList = itemList;
        this.buildMenu();
    },
    
    appendItem: function(item) {
        this.itemList.push(item);
    },
    
    prependItem: function(item) {
        this.itemList.unshift(item);
    },
    
    insertItem: function(item, index) {
        this.itemList.splice(index, 0, item);
    },
    
    removeAll: function() {
        this.itemList = [];
        this.menu.removeAll();
    },
    
    buildMenu: function() {
        this.menu.removeAll();
        
        for (let i = 0; i < this.itemList.length; i++) {
            let item = this.itemList[i];
            if (item.separator) {
                this.menu.addSeparator();
            }
            else {
                item.menuItem = this.menu.addEntry(item.text);
                item.menuItem.connect("select", Lang.bind(this, this.onValueSelected));
            }
        }
    },
    
    onValueSelected: function(menuItem) {
        this.menu.close();
        if (this._selected == menuItem) return;
        
        let item;
        for (let i = 0; i < this.itemList.length; i++) {
            item = this.itemList[i];
            if (menuItem == item.menuItem) {
                break;
            }
        }
        
        if (!item) return;
        this._selected = item;
        this.selectedLabel.text = item.text;
        
        this.emit("selection-changed");
    },
    
    getValue: function() {
        if (this._selected) {  
            if (this._selected.value) return this._selected.value;
            else return this._selected.text;
        }
        else return null;
    },
    
    getText: function() {
        if (this._selected) return this._selected.text;
        else return null;
    },
    
    setIndex: function(index) {
        this._selected = this.itemList[index];
    },
    
    getIndex: function(index) {
        for (let i = 0; i < this.itemList.length; i++) {
            if (this.itemList[i] == this._selected) return i;
        }
        return -1;
    }
}
Signals.addSignalMethods(ComboBox.prototype);
