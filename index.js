Array.prototype.insert = function (index, item) {
  this.splice(index, 0, item);
};

var SidebarNode = new Vue({
	el: "#SidebarNode",
	data: {
		tags: "hi"
	}
});

var ContentNode = new Vue({
	el: "#ContentNode",
	data: {
		lines: [{"left":"", "right":"", "text":""}],
		current_line: 0,
		maximum_line: 0,
	},
	methods: {
		phrase_current_line: function() {
			text = this.lines[this.current_line].text;
			if (text.includes('@h1')) {
				this.lines[this.current_line].left = "TITLE";
				this.lines[this.current_line].right = text.replace(/@h1 /, "");
			} else {
				this.lines[this.current_line].left = "";
				this.lines[this.current_line].right = this.lines[this.current_line].text;
			}
		},
		insert_line: function(pos) {
			this.lines.insert(pos, {"left":"", "right":"", "text":""});
		},
		onEnter: function() {
			this.phrase_current_line();
			this.insert_line(this.current_line+1);
			if (this.maximum_line == this.current_line) {
				this.maximum_line += 1;
			}
			this.current_line += 1;
		},
		onLineClick: function(pos) {
			this.phrase_current_line();
			this.current_line=pos;
		}
	},
	updated: function () {
		$("#current_input").focus();
	}
});
