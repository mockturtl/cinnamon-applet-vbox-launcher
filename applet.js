const Applet = imports.ui.applet
const Config = imports.misc.config
const GLib = imports.gi.GLib
const Gtk = imports.gi.Gtk
const Lang = imports.lang
const PopupMenu = imports.ui.popupMenu
const Settings = imports.ui.settings
const Util = imports.misc.util

const UUID = "vboxlauncher@mockturtl"
const ICON = "virtualbox"
const CMD = "virtualbox"
const CMD_VM = CMD + " --startvm "
const CMD_LIST = "vboxmanage list vms"
const CMD_SETTINGS = "cinnamon-settings applets " + UUID

const KEY_UPDATE = "autoUpdate"
const PROP_UPDATE = "_" + KEY_UPDATE


function MyApplet(metadata, orientation, panelHeight, instanceId) {
	this.settings = new Settings.AppletSettings(this, UUID, instanceId)
	this._init(orientation, panelHeight, instanceId)
}

MyApplet.prototype = {
	__proto__: Applet.IconApplet.prototype

,	_init: function(orientation, panelHeight, instanceId) {
		Applet.IconApplet.prototype._init.call(this, orientation, panelHeight, instanceId)

		try {
			this.set_applet_icon_name(ICON)
			
			this.menuManager = new PopupMenu.PopupMenuManager(this)
			this.menu = new Applet.AppletPopupMenu(this, orientation)
			this.menuManager.addMenu(this.menu)

			this.settings.bindProperty(Settings.BindingDirection.IN, KEY_UPDATE, PROP_UPDATE,
																 this.onSwitchAutoUpdate, null)

      // configuration via context menu is automatically provided in Cinnamon 2.0+
      let cinnamonVersion = Config.PACKAGE_VERSION.split('.')
      let majorVersion = parseInt(cinnamonVersion[0])
      global.log("cinnamonVersion=" + cinnamonVersion +  "; majorVersion=" + majorVersion)

      // for Cinnamon 1.x, build a menu item
      if (majorVersion < 2) {
        let settingsMenuItem = new Applet.MenuItem(_("Settings"), Gtk.STOCK_EDIT, Lang.bind(this, function() {
          Util.spawnCommandLine(CMD_SETTINGS)
        }))
        this._applet_context_menu.addMenuItem(settingsMenuItem)
      }

			this.updateMenu()
		}
		catch (e) {
			global.logError(e)
		}
	}
	
,	updateMenu: function() {
		this.menu.removeAll()
		try {
			let menuitemVbox = new PopupMenu.PopupMenuItem("VirtualBox")
			menuitemVbox.connect('activate', Lang.bind(this, this.startVbox))
			this.menu.addMenuItem(menuitemVbox)
			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem())
			
			let [res, out, err, status] = GLib.spawn_command_line_sync(CMD_LIST)
			
			if(out.length!=0) {
				let machines = out.toString().split("\n")
				for (let i = 0; i < machines.length; i++) {
					let machine = machines[i]
					if(machine=="") continue
					let info = machine.split('" {')
					
					let name = info[0].replace('"', '')
					let id = info[1].replace('}', '')
					
					let menuitem = new PopupMenu.PopupMenuItem(name)
					menuitem.connect('activate', Lang.bind(this, function() { this.startVM(id) }))
					this.menu.addMenuItem(menuitem)
				}
			}
		} catch(e) {
			this.menu.addMenuItem(new PopupMenu.PopupMenuItem("ERROR. Make sure Virtualbox is installed.", { reactive: false }))
		}
		
		if(!this[PROP_UPDATE]) {
			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem())
			let menuitemUpdate = new PopupMenu.PopupMenuItem("Update list")
			menuitemUpdate.connect('activate', Lang.bind(this, this.updateMenu))
			this.menu.addMenuItem(menuitemUpdate)
		}
	}
	
,	startVM: function(id) {
		Util.spawnCommandLine(CMD_VM + id)
	}
	
,	startVbox: function() {
		Util.spawnCommandLine(CMD)
	}

,	on_applet_clicked: function(event) {
		if(this[PROP_UPDATE] && !this.menu.isOpen) {
			this.updateMenu()
		}
		this.menu.toggle()
	}
	
,	onSwitchAutoUpdate: function() {
		if(!this[PROP_UPDATE]) {
			this.updateMenu() // Needed to make update button reappear if setting switched to off
		}
	}
	
}

function main(metadata, orientation, panelHeight, instanceId) {
	return new MyApplet(metadata, orientation, panelHeight, instanceId)
}
