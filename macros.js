emojiEnabled = {
    melee: '⚔️',
    ranged: '🏹',
    damage: '💥',
    height: '🔼',
    heal: '❤️',
    hero: '👤',
    enemy: '💀',
    fatal: '☠️',
    save: '🛡️',
    ability: '🌟',
    skill: '🛠️',
    sneak: '🗡️',
    miss: '💢',
    critical: '⚠',
    touch: '✋',
    die: '🎲',
    positive: '🔆',
    pos: '🔆',
    negative: '💀',
    neg: '💀',
    electric: '⚡',
    elec: '⚡',
    acid: '☣',
    cold: '❄',
    sonic: '🔊',
    fire: '🔥',
    mental: '💫',
    holy: '🎆',
    unholy: '🎇',
    good: '😇',
    evil: '😈',
    lawful: '⚖',
    law: '⚖',
    chaos: '🌀',
    chaotic: '🌀',
    poison: '☢',
    bleed: '💦',
    force: '🌌',
    precision: '🎯',
    strength: '💪',
    dexterity: '👋',
    constitution: '💗',
    intelligence: '📚',
    wisdom: '👁️‍🗨️',
    charisma: '🎭',
    fort: '👊',
    fortitude: '👊',
    ref: '⏳',
    reflex: '⏳',
    will: '🧠',
    time: '♻',
    range: '📏',
    target: '📍'
}

emojiDisabled = {}
for (let key in emojiEnabled) {
    emojiDisabled[key] = '';
    emojiEnabled[key] += '&nbsp;';
}

options = {
    outputType: 'macros'
}

flags = {
    uppercaseNames: true,
    includeMap: true,
    separateMap: false,
    includePrompts: true,
    includeInit: true,
    includeSecret: true,
    includeCrits: false,
    emoji: true,
    includePersist: true
}

library = {}

if (localStorage.hasOwnProperty('flags')) {
    flags = JSON.parse(localStorage.getItem("flags"));
} else {
    localStorage.setItem('flags', JSON.stringify(flags));
}

processor = {
    currentMacro: "",
    characterName: "",
    characterShowName: "",
    emoji: '',
    gmInit: false,
    hasHiddenMacros: false,
    hideDC: false,
    template: "default",
    skills: {},
    variables: {},
    bars: [0, 0, 0],
    labels: [],
    output: "",
    character: "",
    blankChar: '&#8203;', // Trick roll20 into allowing same name labels
    // newLine: "[n](https://i.imgur.com/brRjmYp.png)",
    newLine: '\n',
    attributes: {},
    damageHints: [
        "p", "p/s", "s", "b", "piercing", "slashing", "bludgeoning", "fire",
        "acid", "sonic", "cold", "electric", "elec", "force", "good", "evil",
        "holy", "unholy", "mental", "pos", "neg", "positive", "negative",
        "poison", "precision", "sneak", "damage", "untyped", "misc", "miss",
        "law", "lawful", "chaos", "chaotic", "bleed"
    ],
    healHints: [
        "positive", "healing", "heal", "pos"
    ],
    fatalHints: [
        "p", "p/s", "s", "b", "piercing", "slashing", "bludgeoning"
    ],
    saveHints: [
        "fort", "ref", "will", "reflex", "fortitude"
    ],
    skillHints: [
        "acrobatics", "arcana", "athletics", "crafting", "deception",
        "diplomacy", "intimidation", "medicine", "nature", "occultism",
        "perception", "performance", "religion", "society", "stealth",
        "survival", "thievery", "lore", "other"
    ],
    newMacro: function(name) {
        macros[name] = {
            name: name,
            showName: name,
            source: '',
            render: true,
            gmNotes: false,
            useTemplate: true,
            image: '',
            hidden: false,
            heightens: {},
            header: [],
            main: [],
            footer: [],
            gm: [],
            refs: [],
            submacros: {}
        };
    }
}

macros = {}

processors = {
    "$": function(line) { // register a variable
        let words = line.match(/\w+/g) || [];
        if (words.length > 1) {
            let name = words.shift();
            processor.variables[name] = words.join(' ');
        }
    },
    "!": function(line) { // Declare a macro
        let name = line.replace(/\(.+\)/gi, '').trim();

        processor.currentMacro = line;
        processor.currentSubMacro = "";

        processor.newMacro(line);
        macros[processor.currentMacro].showName = name;
    },
    "*": function(line) { // Add a note (doesn't roll dice)
        // macros[processor.currentMacro].footer.push({
        let label = processor.blankChar;
        if (line.includes(":")) {
            let tokens = line.split(":");
            label = tokens[0].trim();
            line = tokens[1].trim();
        }
        pushMacro("footer", {
            label: label,
            output: `*${line}*`
        })
    },
    "%": function(line) { // Add a whispered GM note to the end of a macro
        macros[processor.currentMacro].gm.push(line);
    },
    "+": function(line) { // Heightening spells
        let words = line.match(/\w+/g) || [];
        let level = `+${words[0]}`;
        let raw = line.replace(/\d\s/, '');
        let roll = processDice(raw)

        if (processor.currentSubMacro) {
            if (macros[processor.currentMacro].submacros[processor.currentSubMacro].heightens.hasOwnProperty(level)) {
                macros[processor.currentMacro].submacros[processor.currentSubMacro].heightens[level].output += processor.newLine + roll;
            } else {
                macros[processor.currentMacro].submacros[processor.currentSubMacro].heightens[level] = {
                    output: roll,
                    raw: raw
                }
            }
        } else {
            if (macros[processor.currentMacro].heightens.hasOwnProperty(level)) {
                macros[processor.currentMacro].heightens[level].output += processor.newLine + roll;
            } else {
                macros[processor.currentMacro].heightens[level] = {
                    output: roll,
                    raw: raw
                }
            }
        }


    },
    "-": function(line) { // Becomes the '?' macro for GMs
        if (!macros.hasOwnProperty('?')) {
            processor.newMacro('?');
            macros['?'].gmNotes = true;
        }

        macros['?'].main.push({
            label: processor.blankChar,
            output: line
        });
    },
    "=": function(line) {
        macros[processor.currentMacro].image = `[i](${line})`;
    },
    "?": function(line) { // Prompt split by ?
        let tokens = line.split('?');

        let question = tokens[0];
        tokens.shift();
        let answers = "";
        for (let token of tokens) {
            answers += `|${token.trim()},${processDice(token.trim())}`;
        }

        // macros[processor.currentMacro].main.push({
        pushMacro("main", {
            label: question,
            output: `?{${question.trim()}${answers}}`
        })
    },
    ".": function(line) { // skills
        let match = (/([a-zA-Z ]+)(\S+)/g).exec(line) || '';
        if (match.length > 1) {
            let name = match[1].trim();
            let value = match[2].trim();

            if (!name.toLowerCase().includes("lore")) {
                for (let skill of processor.skillHints) {
                    if (skill.startsWith(name.toLowerCase()))
                        name = skill.capitalize();
                }
            }

            processor.skills[name] = value;
        }
    },
    ",": function(line) {
        pushMacro("footer", {
            label: `${line}`,
            output: processor.blankChar
        })
    },
    "|": function(line) {

    },
    "_": function(line) {

    },
    ":": function(line) { // Add but dont show as token action
        processors["!"](line); // alias
        macros[processor.currentMacro].hidden = true;
        processor.hasHiddenMacros = true;
    },
    ";": function(line) { // Macro that is whispered to GM
        processors["!"](line); // alias
        macros[processor.currentMacro].gmNotes = true;
    },
    "~": function(line) { // Roll initative as fast as possible
        if (line) {
            processor.newMacro("_combat")
            macros["_combat"].main.push(`${processor.characterShowName}Combat Init [[1d20${line.ensureSign()} &{tracker}]]`);
            macros["_combat"].gmNotes = true;
            macros["_combat"].useTemplate = false;
            macros["_combat"].hidden = true;
        }
    },
    ">": function(line) {
        let words = line.match(/\w+/g) || [];
        if (words.length > 1) {
            let name = words.shift();
            let tokens = line.substring(name.length).split('/');
            let value = tokens[0];
            let max = tokens[1] || "";
            processor.attributes[name] = {
                value: value.trim(),
                max: max.trim()
            }
        }
    },
    "&": function(line) {
        // Reserved for preprocessor
    },
    "^": function(line) {
        let name = line.replace(/\(.+\)/gi, '').trim();
        macros[processor.currentMacro].submacros[line] = {
            name: line,
            main: [],
            footer: [],
            heightens: {}
        }
        processor.currentSubMacro = line;
    },
    "/": function(line) {
        macros[processor.currentMacro].showName = line;
    },
    "@": function(line) { // Call a different macro from this character
        let name = line;
        for (let key in macros) {
            let macro = macros[key];
            if (macro.showName.toLowerCase() == name.toLowerCase()) {
                name = macro.name;
                break;
            }
        }
        if (flags.uppercaseNames)
            name = name.toUpperCase();

        macros[processor.currentMacro].refs.push(`%{${processor.characterName}|${name}}`);
    },
    "melee": function(line, label = `${emoji.melee}Melee`) {
        let words = line.match(/\w+/g) || [];
        let bonus = line.match(/\b\d+\b/) || ["0"];
        let range = line.match(/\b\d+ft\b/i) || [""];

        bonus = bonus[0];
        range = range[0];

        let mapValues = "-0|-5|-10";
        if (words.includes("agile")) {
            mapValues = "-0|-4|-8";
        }
        if (words.includes("hunted")) {
            mapValues = "-0|-3|-6";
        }

        let escalation = "";
        if (words.includes("esc") || words.includes("escalation")) {
            escalation = "+@{tracker|Escalation}[ESCALATION]"
            // macros[processor.currentMacro].footer.push({
            pushMacro("footer", {
                label: `${emoji.die}Escalation`,
                output: "[[@{tracker|Escalation}]]"
            })
        }

        let rangeIncrement = "";
        let reach = "";
        if (range) {
            if (words.includes("reach")) {
                reach = ` ${range} Reach`;
            } else {
                rangeIncrement = "?{Range"
                let rangeNumber = parseInt(range, 10);
                for (let i = 0; i < 5; i++) {
                    let lowRange = rangeNumber * i + 5;
                    let highRange = rangeNumber * (i + 1);
                    let penalty = i * 2;
                    rangeIncrement += `|${lowRange}ft-${highRange}ft,-${penalty}`
                }
                rangeIncrement += "}"
            }
        }

        let sweepBonus = "";
        if (words.includes("sweep")) {
            sweepBonus = `+?{Sweep|0|1|2|3|4|5|6|7|8|9}[Sweep Bonus]`
        }

        if (words.includes("touch")) {
            label += ` ${emoji.touch}Touch`
        }

        if (flags.separateMap) {
            let maps = mapValues.split('|');
            for (let map of maps) {
                let name = `${processor.currentMacro} ${map}`;
                processor.newMacro(name)
                macros[name].source = processor.currentMacro;
                macros[name].showName = `${macros[processor.currentMacro].showName} ${map}`;
                macros[processor.currentMacro].render = false;
                macros[name].main.push({
                    // pushMacro("main", {
                    label: label,
                    output: `[[1d20${bonus.ensureSign()}${map}${escalation}${rangeIncrement}${sweepBonus}]]${reach}`
                });
            }
        } else {
            let map = `?{MAP|${mapValues}}`;
            if (!flags.includeMap) map = '';
            // macros[processor.currentMacro].main.push({
            pushMacro("main", {
                label: label,
                output: `[[1d20${bonus.ensureSign()}${map}${escalation}${rangeIncrement}${sweepBonus}]]${reach}`
            });
        }
    },
    "ranged": function(line) {
        processors["melee"](line, `${emoji.ranged}Ranged`);
    },
    "fatal": function(line) {
        for (let other of macros[processor.currentMacro].main) {
            if (other.label.includes("Damage")) {
                let words = other.output.toLowerCase().match(/\w+/g) || [];
                if (intersects(words, processor.fatalHints)) {
                    let fatal = other.output.replace(/d\d+/gi, line)

                    // macros[processor.currentMacro].main.push({
                    pushMacro("main", {
                        label: `${emoji.fatal}Fatal`,
                        output: fatal
                    })
                    if (flags.includeCrits) {
                        // macros[processor.currentMacro].main.push({
                        pushMacro("main", {
                            label: `${emoji.fatal}Fatal Crit`,
                            output: fatal
                        })
                    }
                }
            }
        }
    },
    "miss": function(line) {
        // macros[processor.currentMacro].main.push({
        pushMacro("main", {
            label: `${emoji.miss}Miss`,
            output: processDice(line)
        })
    },
    "sneak": function(line) {
        // macros[processor.currentMacro].main.push({
        pushMacro("main", {
            label: `${emoji.sneak}Sneak Attack`,
            output: processDice(line)
        })
    },
    "deadly": function(line) {
        // macros[processor.currentMacro].main.push({
        pushMacro("main", {
            label: `${emoji.fatal}Deadly`,
            output: processDice(line)
        })
    },
    "char": function(line) {
        processor.characterName = line;
        if (!processor.characterShowName)
            processor.characterShowName = line + ' ';
        if (!processor.emoji)
            processor.emoji = emoji.hero;
    },
    "as": function(line) {
        processor.characterShowName = line + ' ';
    },
    "enemy": function(line) {
        processor.emoji = emoji.enemy;
        processor.gmInit = true;
        processor.hideDC = true;
    },
    "template": function(line) {
        processor.template = line;
    },
    "inc": function(line) {

    },
    "emoji": function(line) {
        if (flags.emoji)
            processor.emoji = line + ' ';
    },
    "range": function(line) {
        pushMacro("main", {
            label: `${emoji.range}Range`,
            output: line
        })
    },
    "target": function(line) {
        pushMacro("main", {
            label: `${emoji.target}Target`,
            output: line
        })
    },
    "abilities": function(line) {
        let words = line.match(/\S+/g);
        if (!words)
            return;

        let name = ".abilities"

        processor.newMacro(name);
        macros[name].showName = "Abilities"

        let abilityNames = [
            "Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"
        ]

        let output = "?{Ability";
        let i = 0;
        for (let word of words) {
            let ability = abilityNames[i];
            let prompt = bonusPrompt(ability);
            output += `|${emoji[ability.toLowerCase()]}${ability} (${word.ensureSign()}),{{${emoji[ability.toLowerCase()]}${ability}=[[d20${word.ensureSign()}${prompt}]]&#125;&#125;`
            i++;
            processor.attributes[ability] = {
                value: word,
                max: ""
            }
        }
        output += "}"

        macros[name].main.push(output);
    },
    "token": function(line) {
        let words = line.match(/\S+/g);
        if (!words)
            return;

        processor.bars = [
            words[0],
            words[1],
            words[2]
        ];
    },
    "saves": function(line) {
        let words = line.match(/\S+/g);
        if (!words)
            return;

        let name = ".saves"

        processor.newMacro(name);
        macros[name].showName = "Save"

        let saveNames = [
            "Fortitude", "Reflex", "Will"
        ]

        let output = "?{Stats";
        let i = 0;
        for (let word of words) {
            let save = saveNames[i];
            let prompt = bonusPrompt(save);
            output += `|${emoji[save.toLowerCase()]}${save} (${word.ensureSign()}),{{${emoji.save}${emoji[save.toLowerCase()]}${save}=[[d20${word.ensureSign()}${prompt}]]&#125;&#125;`
            i++;
            processor.attributes[save] = {
                value: word,
                max: ""
            }
        }
        output += "}"

        macros[name].main.push(output);
    }
}

function decodehtml(html) {
    var txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
};

function pushMacro(type, macro) {
    if (processor.currentSubMacro) {
        macros[processor.currentMacro].submacros[processor.currentSubMacro][type].push(macro);
    } else {
        macros[processor.currentMacro][type].push(macro);
    }
}

function process(line) {
    let label = "";
    let roll = "";
    let isDamage = false;
    let words = line.match(/\S+/g);

    if (line.includes(":")) {
        let tokens = line.split(':');
        label = tokens[0].trim();
        roll += processDice(tokens[1].trim());
    } else if (line.match(/^-?\+?\d*d*\d+/gi)) {
        if (intersects(processor.damageHints, words)) {
            if (intersects(processor.healHints, words)) {
                label = `${emoji.heal}Heal`;
                roll = processDice(line);
            } else {
                let prompt = ""

                let typeEmoji = "";
                for (let key in emoji) {
                    if (key == "damage")
                        continue;

                    if (words.includes(key)) {
                        typeEmoji += emoji[key];
                    }
                }

                if (words.includes("forceful")) {
                    prompt += "+?{Forceful|0|1|2|3|4|5|6|7|8|9}[Forceful Bonus]";
                }

                prompt += decodehtml(bonusPrompt("Damage"));

                if (words.includes("persistent") || words.includes("persist")) {
                    roll = line.capitalize();
                    label = `${emoji.time}${typeEmoji}Damage`;

                    if (flags.includePersist) {
                        let name = processor.currentMacro + ' (Persist)';
                        processor.newMacro(name);
                        macros[name].main.push({
                            label: label,
                            output: processDice(roll)
                        })
                    }
                } else {
                    roll += processDice(line, prompt);
                    label = `${emoji.damage}${typeEmoji}Damage`;
                    isDamage = true;
                }

            }
        }
    } else if (intersects(processor.saveHints, words)) {
        let save = words[0];
        label = `${emoji.save}${emoji[save.toLowerCase()]}${save.capitalize()}`;
        if (processor.hideDC) {
            roll = "?";
            macros[processor.currentMacro].gm.push(`${label} DC ${words[1]}`);
        } else
            roll = words[1];
    } else if (processor.skillHints.includes(words[0].toLowerCase())) {
        processors["."](line);
        return;
    } else {
        label = processor.blankChar;
        roll = line;
    }

    // macros[processor.currentMacro].main.push({
    pushMacro("main", {
        label: label,
        output: roll
    })

    if (flags.includeCrits && isDamage) {
        // macros[processor.currentMacro].main.push({
        pushMacro("main", {
            label: `${emoji.critical}Critical`,
            output: roll
        })
    }
}

function bonusPrompt(name, init = 0) {
    if (flags.includePrompts)
        return `+0?{${name} Bonus&#124;${init}&#125;[${name} Bonus]`;
    return '';
}

function processDice(input, bonuses = '') {
    input = input.replace(/\bd\d/gi, `1$&`);
    return input.capitalize().replace(/(^|\s)([+-]?\d*d?\d+\S*)/gi, `[[$2${bonuses}]]`);
    // return input.capitalize().replace(/[-+]?\d*d?\d*[-+]?\d+/gi, `[[$&${bonuses}]]`);
}

function isNumeric(num) {
    return !isNaN(num)
}

String.prototype.ensureSign = function() {
    let number = parseInt(this, 10);
    if (isNumeric(number)) {
        if (number >= 0)
            return `+${number}`;
    }
    return `${number}`;
}

function stripComments(input) {
    return input.replace(/#.*/gmi, '');
}

function intersects(array1, array2) {
    return array1.filter(value => array2.includes(value)).length > 0
}

String.prototype.capitalize = function() {
    return this.replace(/(?:^|\s|\/|\()\S/g, function(a) {
        return a.toUpperCase();
    });
};

function compileMacro(line) {
    let output = "";
    if (typeof line == 'string')
        output += line;
    else {
        while (processor.labels.includes(line.label)) {
            line.label += processor.blankChar;
        }

        output += `{{${line.label}=${line.output}}} `

        processor.labels.push(line.label);
    }
    return output;
}

function compile(input) {
    input = stripComments(input);

    // Process library
    let libkey = "";
    for (let lib of librarydata.match(/[^\r\n]+/g)) {
        if (lib.charAt(0) == '!') {
            let name = lib.replace(/!\s*/, '');
            libkey = name.replace(/\s*\(.*\)\s*/gi, '');
            library[libkey] = {
                name: name,
                key: libkey,
                input: ""
            };
        } else {
            if (libkey) {
                library[libkey].input += lib + "\n";
            }
        }
    }

    if (!input)
        return "";

    // Save flags
    localStorage.setItem('flags', JSON.stringify(flags));

    // Reset everything!!
    macros = {};
    processor.characterName = "";
    processor.characterShowName = "";
    processor.emoji = '';
    processor.gmInit = false;
    processor.hideDC = false;
    processor.template = "default";
    processor.hasHiddenMacros = false;
    processor.skills = {};
    processor.variables = {};
    processor.attributes = {};
    processor.labels = [];
    processor.bars = [0, 0, 0];
    processor.output = "";
    processor.character = "";
    processor.newMacro(processor.blankChar);
    processor.currentMacro = processor.blankChar;
    processor.currentSubMacro = "";
    macros[processor.blankChar].render = false;

    emoji = flags.emoji ? emojiEnabled : emojiDisabled;



    // Preprocessor for includes
    let count = 0;
    while (input.match(/^inc.+/gmi)) {
        input = input.replace(/^inc.+/gmi, function(match) {
            let name = match.replace(/^inc\s*/, '') || "";
            let data = localStorage.getItem(`macro_${name}`) || ""

            return data + '\n\n';
        })
        if (count == 1000) break;
        count++;
    }

    // Preproccessor for variables to allow use in library macros
    for (let line of input.match(/^\$.+/gmi) || []) {
        let words = line.substring(1).trim().match(/\w+/g) || [];
        let name = words.shift();
        if (!processor.variables[name])
            processor.variables[name] = words.join(' ');
    }

    // Preproccessor for fetching data from the library (lib.js)
    // lmao regex is wild
    count = 0;
    while (input.match(/^\&.+/gmi)) {
        input = input.replace(/^\&.*/gmi, function(match) {
            let line = match.substring(1).trim();
            if (!line)
                return "";

            line = line.replace(/\$\w+/gi, function(match) {
                return processor.variables[match.substring(1)] || '';
            });

            let name = "";
            let keys = Object.keys(library).sort(function(a, b) {
                return b.length - a.length;
            });
            for (let key of keys) {
                if (line.toLowerCase().startsWith(key)) {
                    name = key;
                    line = line.replace(name, "");
                    break;
                }
            }
            if (name == "")
                return name;

            let words = line.match(/\w+/g) || [];

            let content = library[name].input.replace(/\$\d/gi, function(m) {
                let index = parseInt(m.substring(1) - 1, 10);
                return words[index] || 0;
            });
            return `! ${name}\n` + content.replace(/^\s\s*/gm, '').trim();
        })
        if (count == 1000) break;
        count++;
    }

    let lines = input.match(/[^\r\n]+/g);

    // Processor
    for (let line of lines) {
        if (line == "")
            continue;

        let identifier = line.charAt(0);
        let words = line.match(/\w+/g);
        let firstWord = "";
        if (words)
            firstWord = words[0];

        // Replace variables
        if (identifier != '$') {
            line = line.replace(/\$\w+/gi, function(match) {
                return processor.variables[match.substring(1)] || '';
            });
        }

        if (processors.hasOwnProperty(identifier)) {
            processors[identifier](line.substring(1).trim());
        } else if (processors.hasOwnProperty(firstWord)) {
            if (line.includes(":")) {
                process(line);
                continue;
            }
            processors[firstWord](line.replace(firstWord, '').trim());
        } else {
            process(line);
        }
    }

    // For the VTT Enhancement Suite character importer!
    let vttjson = {
        schema_version: 2,
        name: processor.characterName,
        gmnotes: input.replace(/\n/gmi, '<br />'),
        oldId: "__________?", // VTTES does a replace on this?
        avatar: "",
        bio: "",
        defaulttoken: "",
        tags: "",
        controlledby: "",
        inplayerjournals: "",
        attribs: [{
            name: "AC",
            current: processor.bars[2],
            max: "",
            id: ""
        }, {
            name: "HP",
            current: processor.bars[1],
            max: processor.bars[1],
            id: ""
        }, {
            name: "Speed",
            current: processor.bars[0],
            max: "",
            id: ""
        }],
        abilities: []
    }

    processor.character += `!make --name ${processor.characterName} `;
    processor.character += `--speed ${processor.bars[0]} `;
    processor.character += `--hp ${processor.bars[1]} `;
    processor.character += `--ac ${processor.bars[2]} `;
    processor.character += `--gmnotes ${Base64.encode(input)} `

    for (let key in processor.attributes) {
        let attrib = processor.attributes[key];
        vttjson.attribs.push({
            name: key,
            current: attrib.value,
            max: attrib.max,
            id: ""
        })
    }

    for (let key in macros) {
        let macro = macros[key];
        processor.labels = [];

        if (macro.source) {
            let source = macros[macro.source];
            for (let obj of source.main) {
                macro.main.push(obj);
            }
        }

        if (!macro.render)
            continue;

        let name = macro.name;
        if (flags.uppercaseNames)
            name = name.toUpperCase();

        let vttability = {
            name: name,
            istokenaction: true,
            action: "",
            description: "",
            order: -1
        }

        if (!macro.hidden)
            processor.output += `== ${name}\n`

        if (macro.hidden) {
            processor.character += `--hidden ${name} >> `
            vttability.istokenaction = false;
        } else {
            processor.character += `--ability ${name} >> `
        }

        let output = "";

        for (let line of macro.header) {
            output += compileMacro(line);
        }
        if (macro.gmNotes) {
            output += "/w gm ";
        }

        if (macro.useTemplate)
            output += `&{template:${processor.template}} {{name=${macro.image}${processor.emoji}${processor.characterShowName.capitalize()}**${macro.showName.capitalize()}**}} `

        for (let line of macro.main)
            output += compileMacro(line);

        if (Object.keys(macro.heightens).length) {
            let blankPadding = '';
            output += "?{Heightened|+0,"
            for (let key in macro.heightens) {
                let heighten = macro.heightens[key];
                output += `|${key} (${heighten.raw}),{{${emoji.height}Heighten&nbsp;${key}${blankPadding}=${heighten.output}&#125;&#125;`
                blankPadding += processor.blankChar;
            }
            output += "}"
        }

        if (Object.keys(macro.submacros).length) {
            output += `?{${macro.showName}`;
            for (let subname in macro.submacros) {
                let submacro = macro.submacros[subname];
                output += `|${subname},{{${subname}&#125;&#125;`
                for (let subline of submacro.main) {
                    let subout = compileMacro(subline)
                        .replace(/\|/g, '&#124;')
                        .replace(/\}/g, '&#125;')
                        .replace(/\,/g, '&#44;')
                        .trim();
                    output += `${subout}`;
                }

                for (let subline of submacro.footer) {
                    let subout = compileMacro(subline)
                        .replace(/\|/g, '&#124;')
                        .replace(/\}/g, '&#125;')
                        .replace(/\,/g, '&#44;')
                        .trim();
                    output += `${subout}`;
                }
                /*
                // Cant have sub macros in sub macros unfortunately
                if (Object.keys(submacro.heightens).length) {
                    let blankPadding = '';
                    output += "?{Heightened&#124;+0&#44;"
                    for (let key in submacro.heightens) {
                        let heighten = submacro.heightens[key];
                        output += `&#124;${key} (${heighten.raw})&#44;{{${emoji.height}Heighten&nbsp;${key}${blankPadding}=${heighten.output}&#125;&#125;`
                        blankPadding += processor.blankChar;
                    }
                    output += "}"
                }
                */
            }

            output += "}";

        }

        for (let line of macro.footer)
            output += compileMacro(line);


        for (let line of macro.refs)
            output += `\n${line}`


        if (macro.gm.length) {
            output += `\n/w gm &{template:${processor.template}} {{name=`;
            let firstLine = true;
            for (let line of macro.gm) {
                if (firstLine)
                    output += `${line}`;
                else
                    output += `${processor.newLine}-${processor.newLine}${line}`;
                firstLine = false;
            }
            output += '}}';
        }

        output = output
            .replace(/\}\}[ ]+/gi, '}}')
            .replace(/\}{3}/gi, '}\n}}')
            .replace(/\}{2}/gi, '\n$&');

        processor.character += Base64.encode(output) + ' ';

        vttability.action = output;
        vttjson.abilities.push(vttability);

        output += "\n\n"
        if (!macro.hidden)
            processor.output += output;
    }

    let output = "";
    let vttability = {
        name: "",
        istokenaction: true,
        action: "",
        description: "",
        order: -1
    }

    if (Object.keys(processor.skills).length) {
        let name = ".skills";
        if (flags.uppercaseNames)
            name = name.toUpperCase();

        vttability.name = name;

        output = `&{template:${processor.template}} {{name=${processor.emoji}${processor.characterShowName.capitalize()} **Skills**}} ?{Skill`
        for (let key in processor.skills) {
            let skill = processor.skills[key];
            let name = key.capitalize();
            if (key.toLowerCase() == "other") {
                name = `?{Skill Name&#124;Other&#125;`
            }
            key = key.capitalize();
            let prompt = bonusPrompt("Skill");

            output += `|${key} (+${skill}),{{${emoji.skill}${name}=[[d20+${skill}${prompt}]]&#125;&#125;`

            vttjson.attribs.push({
                name: key,
                current: skill,
                max: "",
                id: ""
            })
        }

        output += "}"
        processor.character += `--ability ${name} >> ${Base64.encode(output)} `;
        vttability.action = output;
        vttjson.abilities.push(vttability);
        output += "\n\n"
        processor.output += `== ${name}\n` + output;

        if (flags.includeInit) {
            output = "";
            vttability = {
                name: "",
                istokenaction: true,
                action: "",
                description: "",
                order: -1
            }

            name = ".initative";
            if (flags.uppercaseNames)
                name = name.toUpperCase();

            vttability.name = name;
            let whisper = processor.gmInit ? "/w gm " : "";

            output += `${whisper}&{template:${processor.template}} {{name=${processor.emoji}${processor.characterShowName.capitalize()} **Initiative**}} ?{Skill`
            for (let key in processor.skills) {
                let skill = processor.skills[key];
                let name = key.capitalize();
                if (key.toLowerCase() == "other") {
                    name = `?{Skill Name&#124;Other&#125;`
                }
                key = key.capitalize();
                let prompt = bonusPrompt(name);

                output += `|${key} (+${skill}),{{${emoji.skill}${name}=[[d20+${skill}${prompt} &{tracker&#125;]]&#125;&#125;`
            }

            output += "}"
            processor.character += `--ability ${name} >> ${Base64.encode(output)} `;
            vttability.action = output;
            vttjson.abilities.push(vttability);
            output += "\n\n"
            processor.output += `== ${name}\n` + output;
        }

        if (flags.includeSecret) {
            output = "";
            vttability = {
                name: "",
                istokenaction: true,
                action: "",
                description: "",
                order: -1
            }

            name = ".secret skills";
            if (flags.uppercaseNames)
                name = name.toUpperCase();
            vttability.name = name;

            output = `/w gm &{template:${processor.template}} {{name=${processor.emoji}${processor.characterShowName.capitalize()} **Secret Skills**}} ?{Skill`
            for (let key in processor.skills) {
                let skill = processor.skills[key];
                let name = key.capitalize();
                if (key.toLowerCase() == "other") {
                    name = `?{Skill Name&#124;Other&#125;`
                }
                key = key.capitalize();
                let prompt = bonusPrompt(name);

                output += `|${key} (+${skill}),{{${emoji.skill}${name}=[&nbsp;](~[[d20+${skill}${prompt}]])&#125;&#125;`
            }

            output += "}"
            processor.character += `--ability ${name} >> ${Base64.encode(output)} `;
            vttability.action = output;
            vttjson.abilities.push(vttability);
            output += "\n\n"
            processor.output += `== ${name}\n` + output;
        }
    }

    if (processor.hasHiddenMacros) {
        output = `/w gm &{template:${processor.template}} {{name=${processor.emoji}${processor.characterName.capitalize()}}}{{`
        for (let key in macros) {
            let macro = macros[key];
            if (macro.hidden) {
                if (macro.name.charAt(0) == '_')
                    continue;
                let name = macro.name;
                if (flags.uppercaseNames)
                    name = name.toUpperCase();
                output += `[${name}](~${processor.characterName}|${name})`
            }
        }
        output += "}}";
        processor.character += `--ability + >> ${Base64.encode(output)} `;
        vttability.name = '+';
        vttability.action = output;
        // vttability.istokenaction = false;
        vttjson.abilities.push(vttability);
        output += "\n\n";
        processor.output += `== +\n` + output;
    }


    if (options.outputType == 'character')
        return processor.character;
    else if (options.outputType == 'vttjson')
        return JSON.stringify(vttjson, null, 2);
    else
        return processor.output;

}

let Base64 = {
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