Array.prototype.insert = function(index, item) {
    this.splice(index, 0, item);
};

Array.prototype.remove = function(index) {
    this.splice(index, 1);
};

function sleep(delay) {
    var start = new Date().getTime();
    while (new Date().getTime() < start + delay);
}

var api_host = "http://127.0.0.1:8080";

var SidebarNode = new Vue({
    el: "#SidebarNode",
    data: {
        items: null,
	username: null
    },
    methods: {
        tags_update: function() {
            $.getJSON(api_host + "/tags/all?callback=?", function(json) {
                SidebarNode.items = json.items;
		SidebarNode.username = json.username;
            });
        },
        tags_open: function(index) {
            if (index == -1) {
                objectID = "";
            } else {
                objectID = this.items[index].objectID;
            }

            $.getJSON(api_host + "/tags/open?callback=?", {
                "objectID": objectID
            }, function(json) {
                OverviewNode.update_items();
            });
        }
    },
    created: function() {
        this.tags_update();
    }
});

var OverviewNode = new Vue({
    el: "#OverviewNode",
    data: {
        tag_name: null,
        items: [],
        current_item: -1
    },
    methods: {
        set_default_current: function() {
            this.current_item = -1;
        },
        update_current_by_id: function(objectID) {
            this.founded = 0;
            $.each(this.items, function(index, item) {
                if (item.objectID == objectID) {
                    OverviewNode.current_item = index;
                    OverviewNode.founded = 1;
                }
            });
            if (this.founded == 0) {
                this.set_default_current();
            }
        },
        update_items: function() {
            $.getJSON(api_host + "/notes/all?callback=?", function(json) {
                OverviewNode.items = json.items;
                OverviewNode.tag_name = json.tag_name;
                if (json.current_objectID != undefined) {
                    OverviewNode.update_current_by_id(json.current_objectID);
                } else {
                    OverviewNode.set_default_current();
                }
            });
        },
        onClick_item: function(index) {
            this.current_item = index;
            ContentNode.open_note(this.items[index].objectID);
        },
        toggleSidebar: function() {
            $('.ui.sidebar').sidebar('toggle');
        },
        onClick_create: function() {
            this.set_default_current();
            ContentNode.create_note();
        }
    },
    created: function() {
        this.update_items();
    }
});

var ContentNode = new Vue({
    el: "#ContentNode",
    data: {
        lines: null,
        current_line: null,
        maximum_line: null,
        title: null,
        tags: null,
        sync_items: 0
    },
    methods: {
        /*
         * Note Handling Functions
         */
        unlock_write: function() {
            this.sync_items += 1;
            $.getJSON(api_host + "/notes/unlock?callback=?", function(json) {
                ContentNode.sync_items -= 1;
            });
        },
        load_note: function() {
            this.sync_items += 1;
            $.getJSON(api_host + "/notes/load?callback=?", function(json) {
                ContentNode.current_line = Number(json.current_line);
                ContentNode.maximum_line = Number(json.maximum_line);
                ContentNode.lines = json.lines;
                ContentNode.title = json.title;
                ContentNode.tags = json.tags;
                ContentNode.unlock_write();
                OverviewNode.update_items();
                ContentNode.sync_items -= 1;
            });
        },
        open_note: function(objectID) {
            this.sync_items += 1;
            $.getJSON(api_host + "/notes/open?callback=?", {
                "objectID": objectID
            }, function(json) {
                ContentNode.load_note();
                ContentNode.sync_items -= 1;
            });
        },
        create_note: function() {
            this.sync_items += 1;
            $.getJSON(api_host + "/notes/create?callback=?", function(json) {
                ContentNode.load_note();
                ContentNode.sync_items -= 1;
            });
        },
        delete_note: function() {
            this.sync_items += 1;
            $.getJSON(api_host + "/notes/delete?callback=?", function(json) {
                SidebarNode.tags_update();
                ContentNode.load_note();
                ContentNode.sync_items -= 1;
            });
        },
        save_note: function() {
            this.sync_items += 1;
            $.getJSON(api_host + "/notes/save?callback=?", {
                "lines": JSON.stringify(this.lines),
                "current_line": this.current_line,
                "maximum_line": this.maximum_line,
                "title": this.title,
                "tags": JSON.stringify(this.tags)
            }, function(json) {
                OverviewNode.update_items();
                SidebarNode.tags_update();
                ContentNode.sync_items -= 1;
            });
        },
        /*
         * Lines Handling Functions
         */
        phrase_current_line: function() {
            this.phrase_line(this.current_line);
        },
        phrase_line: function(pos) {
            raw = this.lines[pos].raw;
            if (raw.includes('@h1 ')) {
                type = "h1";
                text = raw.replace(/@h1 /, "");
                this.title = text;
            } else if (raw.includes('@h2 ')) {
                type = "h2";
                text = raw.replace(/@h2 /, "");
            } else if (raw.includes('@h3 ')) {
                type = "h3";
                text = raw.replace(/@h3 /, "");
            } else if (raw.includes('@dt ')) {
                type = "dt";
                text = raw.replace(/@dt /, "");
                if (text == "") {
                    this.tags = null;
                } else {
                    this.tags = text.split(" ");
                }
            } else if (raw.includes('@* ')) {
                type = "list";
                text = raw.replace(/@\* /, "");
                text = this.phrase_inline(text);
            } else if (raw.includes('@- ')) {
                type = "box";
                text = raw.replace(/@\- /, "");
                text = this.phrase_inline(text);
            } else if (raw.includes('@+ ')) {
                type = "sbox";
                text = raw.replace(/@\+ /, "");
                text = this.phrase_inline(text);
            } else if (raw.includes('@m ')) {
                type = "middle";
                text = raw.replace(/@m /, "");
                text = this.phrase_inline(text);
            } else {
                type = "";
                text = this.phrase_inline(raw);
            }
            this.lines[pos].type = type;
            this.lines[pos].text = text;
            this.save_note();
        },
        phrase_inline: function(text) {
            text = text.replace(/\*{2}.*?\*{2}/g, function(word) {
                return "<i>" + word + "</i>";
            });
            text = text.replace(/\*{1}.*?\*{1}/g, function(word) {
                return "<b>" + word + "</b>";
            });
            text = text.replace(/\-{1}.*?\-{1}/g, function(word) {
                return "<s>" + word + "</s>";
            });
            text = text.replace(/_{1}.*?_{1}/g, function(word) {
                return "<u>" + word + "</u>";
            });
            text = text.replace(/\:{2}.*?\:{2}/g, function(word) {
                return "<span>" + word + "</span>";
            });
            return text
        },
        insert_line: function(pos) {
            this.lines.insert(pos, {
                "type": "",
                "text": "",
                "raw": ""
            });
        },
        delete_current_line: function() {
            if (this.current_line == 0) {
                this.lines[0].raw = "";
            } else {
                this.maximum_line -= 1;
                this.lines.remove(this.current_line);
                this.current_line -= 1;
            }
            this.save_note();
        },
        submit_current_line: function() {
            this.phrase_current_line();
            this.insert_line(this.current_line + 1);
            this.maximum_line += 1;
            this.current_line += 1;
        },
        /*
         * Interface Click Functions
         */
        onEnter: function() {
            this.submit_current_line();
        },
        onDelete: function() {
            if (this.lines[this.current_line].raw == "") {
                this.delete_current_line();
            }
        },
        onUp: function() {
            this.phrase_current_line();
            if (this.current_line != 0) {
                this.current_line -= 1;
            }
        },
        onDown: function() {
            this.phrase_current_line();
            if (this.current_line != this.maximum_line) {
                this.current_line += 1;
            }
        },
        onLineClick: function(pos) {
            this.phrase_current_line();
            this.current_line = pos;
            if (pos > this.maximum_line) {
                this.maximum_line = pos;
            }
        },
        onBoxClick: function(pos) {
            if (this.lines[pos].type == "box") {
                this.lines[pos].raw = this.lines[pos].raw.replace(/@\- /, "@+ ");
                this.phrase_line(pos);
            } else if (this.lines[pos].type == "sbox") {
                this.lines[pos].raw = this.lines[pos].raw.replace(/@\+ /, "@- ");
                this.phrase_line(pos);
            }
        },
        onToggleDelete: function() {
            $('.ui.basic.modal').modal('show');
        }
    },
    updated: function() {
        $("#current_input").focus();
    },
    created: function() {
        this.load_note();
    }
});
