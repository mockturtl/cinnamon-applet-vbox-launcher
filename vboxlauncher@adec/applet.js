const Applet = imports.ui.applet;
const Cinnamon = imports.gi.Cinnamon;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const Main = imports.ui.main;

function MyMenu(launcher, orientation) {
    this._init(launcher, orientation);
}
MyMenu.prototype = {
    __proto__: PopupMenu.PopupMenu.prototype,
    _init: function(launcher, orientation) {
        this._launcher = launcher;
        PopupMenu.PopupMenu.prototype._init.call(this, launcher.actor, 0.0, orientation, 0);
        Main.uiGroup.add_actor(this.actor);
        this.actor.hide();
    }
}

function MyApplet(orientation) {
	this._init(orientation);
};

MyApplet.prototype = {
	__proto__: Applet.IconApplet.prototype,

    _init: function(orientation) {
        Applet.IconApplet.prototype._init.call(this, orientation);

		try {
			this.set_applet_icon_name("virtualbox");
			
			this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.menu = new MyMenu(this, orientation);
            this.menuManager.addMenu(this.menu);
            
            this.updateMenu();
		}
		catch (e) {
			global.logError(e);
		}
	},
	
	updateMenu: function() {
		this.menu.removeAll();
		try {
			let menuitemVbox = new PopupMenu.PopupMenuItem("VirtualBox");
			menuitemVbox.connect('activate', Lang.bind(this, this.startVbox));
			this.menu.addMenuItem(menuitemVbox);
			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
			
			let [res, out, err, status] = GLib.spawn_command_line_sync("vboxmanage list vms");
			
			if(out.length!=0) {
				let machines = out.toString().split("\n");
				for(let i=0; i<machines.length; i++) {
					let machine = machines[i];
					if(machine=="") continue;
					let info = machine.split('" {');
					
					let name = info[0].replace('"', '');
					let id = info[1].replace('}', '');
					
					let menuitem = new PopupMenu.PopupMenuItem(name);
					menuitem.connect('activate', Lang.bind(this, function() { this.startVM(id); }));
					this.menu.addMenuItem(menuitem);
				}
			}
		} catch(e) {
			this.menu.addMenuItem(new PopupMenu.PopupMenuItem("ERROR. Make sure Virtualbox is installed.", { reactive: false }));
		}
		
		this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
		let menuitemUpdate = new PopupMenu.PopupMenuItem("Update list");
		menuitemUpdate.connect('activate', Lang.bind(this, this.updateMenu));
		this.menu.addMenuItem(menuitemUpdate);
	},
	
	startVM: function(id) {
		Main.Util.spawnCommandLine("virtualbox --startvm "+id);
	},
	
	startVbox: function() {
		Main.Util.spawnCommandLine("virtualbox");
	},

	on_applet_clicked: function(event) {
		this.menu.toggle();
	}
};

function main(metadata, orientation) {
	let myApplet = new MyApplet(orientation);
	return myApplet;
}
