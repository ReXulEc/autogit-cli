#! /usr/bin/env node
const yargs = require("yargs");
const fs = require("fs");
const Table = require('cli-table3');
const ngrok = require('ngrok');
const fastify = require('fastify')();
const { createLog } = require('../util/createLog.js');
const { pull } = require('../util/pull.js');
const { handleSignature } = require('../util/verifySignature.js');
const { checkToken } = require('../util/checkToken.js');

let configPath; // Config path
switch (process.platform) {
    case "win32":
        configPath = __dirname + "\\config.json"; // Windows
        break;
    case "linux":
        configPath = __dirname + "/config.json"; // Linux
        break;
    default:
        configPath = __dirname + "/config.json"; // Default
        break;
}


yargs
    .command({
        command: 'list',
        describe: "",
        aliases: 'l',
        handler: function (argv) {

            const table = new Table({
                head: ['ID', 'Name', 'Branch', 'Scripts', 'Path'], // Table headers
                colWidths: [5, 20, 20, 'fluid', 'fluid'], // Set the widths of each column (optional)
                style: {
                    head: ['cyan'], // Header text color
                    border: ['gray'], // Border color
                    //space between cell
                },
                chars: { 'mid': ' ', 'mid-mid': '│', 'left-mid': '│', 'right-mid': '│' }
            });
            fs.readFile(configPath, 'utf8', (err, content) => {
                if (err) {
                    createLog('ERROR', err.message, true); // Error while reading config file
                }
                let config = JSON.parse(content);
                Object.entries(config.listen).forEach(async ([key, repo]) => {
                    //key, git, branch, scripts, path
                    table.push([key, repo.git, repo.branch, repo.script.join('\n'), repo.path])

                })
                console.log(table.toString());
            })

        }
    })
    .command({
        command: 'run [port] [dev]',
        describe: "",
        aliases: 'r',
        builder: {
            port: {
                describe: 'aynn',
                demandOption: false,
                type: 'number',
                usage: 'Usage: $0 <command> [options]',
            },
            dev: {
                describe: 'aynn',
                demandOption: false,
                type: "boolean"
            }
        },
        handler: function (argv) {
            const startTime = process.hrtime();
            PORT = argv.port || 3000;
            console.log(argv.dev)
            if (argv.dev) {
                (async function () {
                    await ngrok.connect({
                      addr: PORT, // port or network address, defaults to 80
                      region: process.env.NGROK_REGION, // one of ngrok regions (us, eu, au, ap, sa, jp, in), defaults to us
                      onStatusChange: status => { createLog("NGROK STATUS", status.charAt(0).toUpperCase() + status.slice(1)) }, // 'closed' - connection is lost, 'connected' - reconnected
                      onLogEvent: data => {
                        if (data.includes("url")) {
                          let url = data.split(" ")[data.split(" ").length - 1].slice(4)
                          createLog("NGROK", `Ngrok is running on ${url}`)
                        }
                      },
                    });
                  })();
            }
            fs.readFile(configPath, 'utf8', (err, content) => {
                if (err) {
                    //checkEnv(err, false);
                    console.log(err)
                }
                let config = JSON.parse(content);
                checkToken(config).then((res) => {
                    if (!res) {
                        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                    }
                })
                fastify.post('/webhook', async (request, reply) => {
                    if (handleSignature(request, config.token) === false) {
                        createLog('ERROR', 'Invalid signature', true);
                        return reply.code(401).send({ received: false, error: 'Invalid signature.' });
                    }

                    config.listen.forEach(async (repo) => {
                        const Checks = () => {
                            if (repo.git.toLowerCase() === request.body.repository.name.toLowerCase() && repo.branch.toLowerCase() === request.body.ref.replace('refs/heads/', '').toLowerCase() && request.body?.commits) {
                                return { success: true, branch: request.body.ref.replace('refs/heads/', '') };
                            } else {
                                return false;
                            }
                        }

                        if (Checks().success === true) {
                            reply.send({ received: true });
                            createLog(repo.git + ' | WEBHOOK', 'Received push event to ' + Checks().branch + ' branch');
                            await pull(repo.path, repo.git, repo.script);
                        } else {
                            reply.send({ received: false })
                        }
                    });
                });

                fastify.listen(
                    {
                        port: PORT,
                        host: '0.0.0.0',
                    },
                    (err) => {
                        if (err) {
                            createLog('ERROR', err.message);
                        } else {
                            createLog('SERVER', `Server is running on port ${PORT}`);
                            createLog('SERVER', `Server started in ${(process.hrtime(startTime)[0] * 1000 + process.hrtime(startTime)[1] / 1000000).toFixed(3)}ms`);
                        }
                    },
                )
            })
        }
    })
    .command({
        command: 'add [git] [branch] [script]',
        describe: "",
        aliases: 'a',
        builder: {
            git: {
                describe: 'aynn',
                demandOption: true,
                type: 'string',
                usage: 'Usage: $0 <command> [options]',
            },
            branch: {
                describe: 'aynn',
                demandOption: true,
                type: 'string'
            },
            script: {
                describe: 'aynn',
                demandOption: true,
                type: 'string'
            },
        },
        handler: function (argv) {

            let yeniVeri = {
                git: argv.git,
                path: process.cwd(),
                branch: argv.branch,
                script: argv.script
            };
            //fs write
            if (typeof argv.script === 'string' || argv.script instanceof String) {
                yeniVeri.script = [argv.script]
            }



            try {
                let mevcutVeriler = [];
                if (fs.existsSync(configPath)) {
                    const dosyaIcerigi = fs.readFileSync(configPath, 'utf8');
                    mevcutVeriler = JSON.parse(dosyaIcerigi);
                }

                mevcutVeriler.listen.push(yeniVeri);

                fs.writeFileSync(configPath, JSON.stringify(mevcutVeriler, null, 2));
                console.log('Veri başarıyla JSON dosyasına eklendi.');
            } catch (hata) {
                console.error('Dosya işlemleri hatası:', hata);
            }
        }
    })
    .command({
        command: 'token [show] [reset]',
        describe: "",
        builder: {

            reset: {
                describe: 'You can reset token with this command',
                demandOption: false,
                type: 'boolean'
            },
            show: {
                describe: 'You can show token with this command',
                demandOption: true,
                type: 'boolean'
            },
        },
        handler: function (argv) {
            fs.readFile(configPath, 'utf8', (err, content) => {
                if (err) {
                    //checkEnv(err, false);
                    checkToken("ERROR FS", err, true)
                }
                let config = JSON.parse(content);
                if (argv.reset === true) {
                    checkToken(config, true).then((res) => {
                        if (res) {
                            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                            createLog("TOKEN", "Token reseted successfully")
                        }
                    })
                }
                if (argv.show === true) {
                    createLog("TOKEN", config.token)
                }
            })
        }
    })
    .command({
        command: 'delete <ID>',
        describe: "",
        aliases: 'a',
        handler: function (argv) {
            //fs write

            // Read the JSON file
            fs.readFile(configPath, 'utf8', (err, data) => {
                if (err) {
                    console.error('Error reading JSON file:', err);
                    return;
                }

                try {
                    // Parse the JSON data
                    const json = JSON.parse(data);

                    // Specify the index of the object you want to delete from the "listen" array
                    const indexToDelete = argv.ID; // Replace with the desired index to delete

                    // Delete the object from the "listen" array at the specified index
                    json.listen.splice(indexToDelete, 1);

                    // Convert the JSON object back to a string
                    const updatedJson = JSON.stringify(json, null, 2);

                    // Write the updated JSON back to the file
                    fs.writeFile(configPath, updatedJson, 'utf8', err => {
                        if (err) {
                            console.error('Error writing JSON file:', err);
                            return;
                        }
                        console.log('JSON file updated successfully.');
                    });
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                }
            });



        }
    })

    .demandCommand()
    .help()
    .argv

/*

yargs.command(['start [app]', 'run', 'up'], 'Start up an app', {}, (argv) => {
    console.log('starting up the', argv.app || 'default', 'app')
  })
  .command({
    command: 'configure <key> [value]',
    aliases: ['config', 'cfg'],
    desc: 'Set a config variable',
    builder: (yargs) => yargs.default('value', 'true'),
    handler: (argv) => {
      console.log(`setting ${argv.key} to ${argv.value}`)
    }
  })
*/

/*
    .command({
        command: 'edit <ID> <Key> <Value>',
        describe: "",
        aliases: 'a',
        handler: function (argv) {
            //fs write

            let jsonFilePath = __dirname + "\\config.json";
            // JSON dosyasını oku
            fs.readFile(jsonFilePath, 'utf8', (err, data) => {
              if (err) {
                console.error('Dosya okunurken bir hata oluştu:', err);
                return;
              }
            
              // JSON verisini ayrıştır
              const json = JSON.parse(data);
            
              // İstenilen öğeyi güncelle
              console.log()
              json.listen[argv.ID][argv.Key] = argv.Value.toString();
              // Güncellenmiş JSON'i dosyaya geri yaz
              fs.writeFile(jsonFilePath, JSON.stringify(json), 'utf8', (err) => {
                if (err) {
                  console.error('Dosyaya yazılırken bir hata oluştu:', err);
                  return;
                }
                console.log('JSON dosyası başarıyla güncellendi.');
              });
              
            });
            



        }
    })

    */