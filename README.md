# breadboard-cli

## Install

```
npm install -g breadboard-cli
```

## Run local script on Breadboard

> run from within a git repo

```
breadboard run [SCRIPT_PATH]
```

## Options

### Use a local deployment of Breadboard

In case you have a locally deployed Breadboard [Community Edition]

```
breadboard run [SCRIPT_PATH] -h https://my_breadboard.com
```

### Use your token

```
breadboard run [SCRIPT_PATH] -t abcdefghizklmnop
```

### Pass QueryStrings

```
breadboard run [SCRIPT_PATH] -q '{ "key" : "val" }
```