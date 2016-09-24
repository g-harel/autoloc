// node packages
var fs = require('fs');
 
// define the way to parse html files
require.extensions['.html'] = function(module, filename) {
    module.exports = fs.readFileSync(filename, 'utf8');
};
 
// define the way to parse json files
require.extensions['.json'] = function(module, filename) {
    var temp;
    try {
         temp = JSON.parse(fs.readFileSync(filename, 'utf8'));
    } catch (e) {
        console.log('ERROR: could not parse json file.\n' + e);
        process.exit();
    }
    module.exports = temp;
};

// extract titles from json object
var titles = [];
try {
    var content = require('./' + (process.argv.slice(2)[0] || 'content.json'));
} catch (e) {
    console.log('ERROR: Could not find content.json or your file in this directory. Make sure to specify the data file in the command or create content.json');
    process.exit();
}
for (var key in content) {
    if (key !=='df' && content.hasOwnProperty(key)) {
        titles.push(key);
    }
}
 
// storing all block snippets from the blocks/ directory
var blocks = {};
try {
    fs.readdirSync('blocks/').forEach(function(name) {
        if (name.match(/\.html$/g)) {
            blocks[name.slice(0,-5)] = require('./blocks/'+ name) || '<!---->';
        }
    });
} catch (e) { /* ~~ Won't break anything ~~ */ }
 
// fetching the template file
try {
    var template = require('./' + (process.argv.slice(2)[1] || 'index.html'));
} catch (e) {
    console.log('ERROR: Could not find index.html or your file in this directory. Make sure to specify the base file in the command or create index.html');
    process.exit();
}

// making sure the build folder exists
if (!fs.existsSync('build/')) {
    fs.mkdirSync('build');
}
 
// replacing the tokens for each title and saving the file
titles.forEach(function(val) {
    var temp = template.slice(0);
    var counter = 0;
    while (temp.match(/&&/g) || temp.match(/@@/)) {
        if (counter > 12) {
            console.log('\n\nERROR:');
            break;
        }
        temp = temp.replace(/\[o\]/g, val);
        temp = temp.replace(/@@(\.\w+)+(\.{.+})?@/g, function(val) {
            return find(content, val.slice(3,-1).split('.'));
            function find(obj, address) {
                if (address[0][0] === '{' && !obj) {
                    console.log('defaulted ' + val + ' to ' + val.slice(3,-1).match(/{.+}/g)[0].slice(1,-1))
                    return val.slice(3,-1).match(/{.+}/g)[0].slice(1,-1);
                } else if (typeof obj === 'string'){
                    return obj;
                } else if (!obj) {
                    console.log('could not find ' + val)
                    return val;
                } else {
                    return find(obj[address.shift()], address);
                }
            }
        });
        temp = temp.replace(/&&\w+(\[\[\s*[\w\d]+\s*\]\])?/g, function(curr) {
            var block = curr.replace(/&&|\[\[s*[\w\d]+\s*\]\]|\s/g, '');
            var name = curr.replace(/&&\w+|\[|\]|\s/g, '');
            return (blocks[block] && ('\n<!--START-'+block+'_'+name+'-->\n'+blocks[block].replace(/\[x\]/g, block+'_'+name)+'\n<!--END-'+block+'_'+name+'-->')) || curr;
        });
        counter++;
    }
    console.log(temp);
    /*temp = temp.split('').map(function(val) {
        var cc = val.charCodeAt(0);
        if (cc > 127) {
            return '&#' + cc + ';';
        }
        return val;
    }).join('');
    fs.writeFileSync(`build/index_${val}.html`, temp);*/
});
