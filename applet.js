const Soup = imports.gi.Soup
const St = imports.gi.St;

const Applet = imports.ui.applet;
const ModalDialog = imports.ui.modalDialog;
const PopupMenu = imports.ui.popupMenu;
const Settings = imports.ui.settings;
const Tooltips = imports.ui.tooltips;

const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Util = imports.misc.util;

const session = new Soup.SessionAsync();
const UUID = "notify@scollins";

imports.searchPath.push( imports.ui.appletManager.appletMeta[UUID].path );
const Combo = imports.combo;


const TYPES = [
    {text: "applets"},
    {text: "desklets"},
    {text: "themes"},
    {text: "extensions"}
]


function MenuItem(parent, info) {
    this._init(parent, info);
}

MenuItem.prototype = {
    __proto__: PopupMenu.PopupBaseMenuItem.prototype,
    
    _init: function(parent, info, params) {
        try {
            
            this.parent = parent;
            this.info = info;
            PopupMenu.PopupBaseMenuItem.prototype._init.call(this, params);
            let title = new St.Label({ text: info.title });
            this.addActor(title);
            this.valueLabel = new St.Label({ text: "" });
            this.addActor(this.valueLabel);
            
            this.offset = 0;
            //let tooltip = new Tooltips.Tooltip(this.actor, info.title);
            this.refresh();
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    updateValue: function(value, offset) {
        this.value = value;
        if ( offset ) {
            this.offset = offset;
            value += " (" + offset + ")";
        }
        else this.offset = 0;
        this.valueLabel.set_text(String(value));
    },
    
    updateCache: function() {
        this.parent.updateCache(this.info, this.value);
        this.updateValue(this.value, 0);
    },
    
    activate: function(event) {
        try {
            this.parent.menu.close();
            this.updateCache();
            this.parent.updateCount();
            Util.spawnCommandLine("firefox http://cinnamon-spices.linuxmint.com/" + this.info.type + "/view/" + this.info.id);
        } catch(e) {
            global.logError(e);
        }
    },
    
    refresh: function(event) {
        this.parent.refresh_data(this.info);
        Mainloop.timeout_add_seconds(600, Lang.bind(this, this.refresh));
    }
}


function MyApplet(orientation, panel_height, instanceId) {
    this._init(orientation, panel_height, instanceId);
}

MyApplet.prototype = {
    __proto__: Applet.TextIconApplet.prototype,
    
    _init: function(orientation, panel_height, instanceId) {
        try {
            
            this.orientation = orientation;
            Applet.TextIconApplet.prototype._init.call(this, this.orientation, panel_height);
            
            this.set_applet_label("comments: 0");
            
            this.settings = new Settings.AppletSettings(this, UUID, instanceId);
            this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL, "spicesList", "spicesList", function(){});
            this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL, "cache", "cache", function(){});
            
            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.menu = new Applet.AppletPopupMenu(this, this.orientation);
            this.menuManager.addMenu(this.menu);
            
            this.buildMenu();
            
            this._applet_context_menu.addAction("Mark all as visited", Lang.bind(this, this.updateAll));
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    on_applet_clicked: function(event) {
        try {
            
            this.menu.toggle();
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    buildMenu: function() {
        
        this.menu.removeAll();
        
        this.menuItems = {};
        for ( let i = 0; i < this.spicesList.length; i++ ) {
            let menuItem = new MenuItem(this, this.spicesList[i]);
            this.menuItems[this.spicesList[i].title] = menuItem;
            this.menu.addMenuItem(menuItem);
        }
        
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        let addNew = new PopupMenu.PopupMenuItem("New...");
        addNew.connect("activate", Lang.bind(this, this.openAddNewDialog));
        this.menu.addMenuItem(addNew);
        
//let menuItem = new PopupMenu.PopupComboBoxMenuItem({});
//this.menu.addMenuItem(menuItem);
//let m1 = new PopupMenu.PopupMenuItem("hello");
//menuItem.addMenuItem(m1);
//let m2 = new PopupMenu.PopupMenuItem("goodbye");
//menuItem.addMenuItem(m2);
    },
    
    refresh_data: function(xlet) {
        
        Soup.Session.prototype.add_feature.call(session, new Soup.ProxyResolverDefault());
        let message = Soup.Message.new('GET', "http://cinnamon-spices.linuxmint.com/" + xlet.type + "/view/" + xlet.id);
        session.queue_message(message, Lang.bind(this, this.parseDoc, xlet));
        
    },
    
    parseDoc: function(session, message, xlet) {
        try {
            
            let docText = message.response_body.data;
            if ( docText == null ) return;
            let lines = docText.split("\n");
            let search;
            let commentsLine = "";
            for ( let i = 0; i < lines.length; i++ ) {
                search = lines[i].search("id=\"comments\"");
                if ( search != -1 ) {
                    search += 14;
                    commentsLine = lines[i];
                    break;
                }
            }
            
            let count;
            for ( let i = search; i < commentsLine.length; i++ ) {
                if ( commentsLine[i] == " " ) {
                    count = (commentsLine.substring(search, i));
                }
            }
            
            if ( this.cache[xlet.type][xlet.id] === undefined ) this.cache[xlet.type][xlet.id] = 0;
            let oldCount = this.cache[xlet.type][xlet.id];
            if ( oldCount != count ) {
                offset = count - oldCount;
                this.menuItems[xlet.title].updateValue(count, offset);
            }
            else this.menuItems[xlet.title].updateValue(oldCount, 0);
            
            this.updateCount();
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    updateCount: function() {
        let count = 0;
        for ( let i in this.menuItems ) {
            count += this.menuItems[i].offset;
        }
        this.set_applet_label("comments: " + count);
    },
    
    updateCache: function(xlet, value) {
        this.cache[xlet.type][xlet.id] = value;
        this.cache = this.cache;
    },
    
    openAddNewDialog: function() {
        try {
            
            this.newEntry = {};
            this.newEntry.dialog = new ModalDialog.ModalDialog({ cinnamonReactive: true });
            
            let content = new St.Table({ homogeneous: false, clip_to_allocation: true, style_class: "notify-dialog-table" });
            this.newEntry.dialog.contentLayout.add_actor(content);
            
            content.add(new St.Label({ text: "Title:  " }), { row: 0, col: 0, col_span: 1, x_expand: false, x_align: St.Align.START });
            this.newEntry.title = new St.Entry({ style_class: "notify-entry" });
            content.add(this.newEntry.title, { row: 0, col: 1, col_span: 1, x_expand: false, x_align: St.Align.START });
            
            content.add(new St.Label({ text: "Type:  " }), { row: 1, col: 0, col_span: 1, x_expand: false, x_align: St.Align.START });
            this.newEntry.type = new Combo.ComboBox(TYPES);
            content.add(this.newEntry.type.actor, { row: 1, col: 1, col_span: 1, x_expand: false, x_align: St.Align.START });
            
            content.add(new St.Label({ text: "ID:  " }), { row: 2, col: 0, col_span: 1, x_expand: false, x_align: St.Align.START });
            this.newEntry.id = new St.Entry({ style_class: "notify-entry" });
            content.add(this.newEntry.id, { row: 2, col: 1, col_span: 1, x_expand: false, x_align: St.Align.START });
            
            this.newEntry.dialog.setButtons([
                { label: "Cancel", key: "", focus: false, action: Lang.bind(this, this._onDialogCancel) },
                { label: "Ok", key: "", focus: true, action: Lang.bind(this, this._onDialogOk) }
            ]);
            
            this.newEntry.dialog.open();
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    _onDialogOk: function() {
        try {
            
            this.addNew(this.newEntry.type.getValue(), this.newEntry.title.text, this.newEntry.id.text);
            
            this.newEntry.dialog.close(global.get_current_time());
            //this.newEntry.dialog.destroy();
            this.newEntry = null;
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    _onDialogCancel: function() {
        this.newEntry.dialog.close(global.get_current_time());
        //throw "hello";
        //this.newEntry.dialog.destroy();
        this.newEntry = null;
    },
    
    addNew: function(type, title, id) {
        if ( !this.cache[type] ) {
            global.logError("Invalid Type " + type);
            return;
        }
        let list = this.spicesList;
        list.push({ type: type, title: title, id: id });
        this.spicesList = list;
        this.cache[type][id] = 0;
        
        this.buildMenu();
    },
    
    updateAll: function() {
        for ( let i in this.menuItems ) this.menuItems[i].updateCache();
        this.updateCount();
    }
}


function main(metadata, orientation, panel_height, instanceId) {
    let myApplet = new MyApplet(orientation, panel_height, instanceId);
    return myApplet;
}