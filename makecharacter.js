// Select a token then do the command to create a sheet and have that token represent it.

// !make --name Test Character --hp 0 --ac 0 --ability Name >> Body --Macro Name >> Macro

// Generate a make command at macros.kpulv.com

var Base64 = {

    // private property
    _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

    // public method for encoding
    encode: function(input) {
        var output = "";
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var i = 0;

        input = Base64._utf8_encode(input);

        while (i < input.length) {

            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);

            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;

            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }

            output = output +
                this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
                this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

        }

        return output;
    },

    // public method for decoding
    decode: function(input) {
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;

        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

        while (i < input.length) {

            enc1 = this._keyStr.indexOf(input.charAt(i++));
            enc2 = this._keyStr.indexOf(input.charAt(i++));
            enc3 = this._keyStr.indexOf(input.charAt(i++));
            enc4 = this._keyStr.indexOf(input.charAt(i++));

            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;

            output = output + String.fromCharCode(chr1);

            if (enc3 != 64) {
                output = output + String.fromCharCode(chr2);
            }
            if (enc4 != 64) {
                output = output + String.fromCharCode(chr3);
            }

        }

        output = Base64._utf8_decode(output);

        return output;

    },

    // private method for UTF-8 encoding
    _utf8_encode: function(string) {
        string = string.replace(/\r\n/g, "\n");
        var utftext = "";

        for (var n = 0; n < string.length; n++) {

            var c = string.charCodeAt(n);

            if (c < 128) {
                utftext += String.fromCharCode(c);
            } else if ((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            } else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }

        }

        return utftext;
    },

    // private method for UTF-8 decoding
    _utf8_decode: function(utftext) {
        var string = "";
        var i = 0;
        var c = c1 = c2 = 0;

        while (i < utftext.length) {

            c = utftext.charCodeAt(i);

            if (c < 128) {
                string += String.fromCharCode(c);
                i++;
            } else if ((c > 191) && (c < 224)) {
                c2 = utftext.charCodeAt(i + 1);
                string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            } else {
                c2 = utftext.charCodeAt(i + 1);
                c3 = utftext.charCodeAt(i + 2);
                string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }

        }

        return string;
    }

}

on("chat:message", function(msg) {
    if (playerIsGM(msg.playerid)) {
        if (msg.type == "api" && msg.content.startsWith("!deleteold")) {
            let characters = findObjs({
                _type: "character"
            })
            for (let i of characters) {
                let name = i.get("name");
                if (name.startsWith("_OLD_")) {
                    log(`*** removing ${name}`);
                    i.remove();
                }
            }
        }

        if (msg.type == "api" && msg.content.startsWith("!barfix") && msg.selected) {
            for (var i = 0; i < msg.selected.length; i++) {
                var obj = getObj(msg.selected[i]._type, msg.selected[i]._id);
                obj.set("bar2_max", "");
                obj.set("bar3_max", "");
            }
        }

        if (msg.type == "api" && msg.content.startsWith("!make ") && msg.selected) {
            args = msg.content.split(" --");

            var charName = "";
            var gmnotes = "";
            var hpvalue = 0;
            var acvalue = 0;
            var tacvalue = 0;
            var abilities = [];

            for (var i = 1; i < args.length; i++) {
                var arg = args[i];
                var word = arg.substr(0, arg.indexOf(' '));
                var value = arg.substr(arg.indexOf(' ') + 1);

                switch (word) {
                    case "name":
                        charName = value;
                        break;

                    case "ability":
                    case "hidden":
                        var ability = value.split(" >> ");
                        var abilityName = ability[0];
                        var abilityAction = ability[1];

                        abilities.push({
                            name: abilityName,
                            action: Base64.decode(abilityAction),
                            istokenaction: (word != "hidden")
                        });
                        break;

                    case "hp":
                        hpvalue = parseInt(value);
                        break;

                    case "ac":
                        acvalue = parseInt(value);
                        break;

                    case "tac":
                        tacvalue = parseInt(value);
                        break;

                    case "speed":
                        speedvalue = parseInt(value);
                        break;

                    case "gmnotes":
                        gmnotes = Base64.decode(value).replace(/\n/g, "<br/>");
                }
            }

            var existing = findObjs({
                _type: "character",
                name: charName
            });

            _.each(existing, function(o) {
                o.set("name", "_OLD_" + charName);
            });

            var obj = createObj("character", {
                name: charName
            });

            obj.set("gmnotes", gmnotes)

            var notes = "";
            for (var i = 0; i < abilities.length; i++) {
                var ability = abilities[i];

                createObj("ability", {
                    name: ability.name,
                    action: ability.action,
                    istokenaction: ability.istokenaction,
                    characterid: obj.id
                })
            }

            var hp = createObj("attribute", {
                name: "HP",
                current: hpvalue,
                max: hpvalue,
                characterid: obj.id
            })

            var ac = createObj("attribute", {
                name: "AC",
                current: acvalue,
                characterid: obj.id
            })

            var tac = createObj("attribute", {
                name: "TAC",
                current: tacvalue,
                characterid: obj.id
            })

            var speed = createObj("attribute", {
                name: "Speed",
                current: speedvalue,
                characterid: obj.id
            })

            for (var i = 0; i < msg.selected.length; i++) {
                var token = getObj("graphic", msg.selected[i]._id);

                token.set("represents", obj.id);
                token.set("bar1_value", hp.get("current"));
                token.set("bar1_max", hp.get("max"));
                token.set("bar2_value", ac.get("current"));
                token.set("bar3_value", speed.get("current"));
                token.set("bar2_max", "");
                token.set("bar3_max", "");
                token.set("name", charName);
                token.set("showname", true);

                var imgsrc = token.get("imgsrc");
                obj.set("avatar", imgsrc);

                setDefaultTokenForCharacter(obj, token);
            }
        }
    }
});