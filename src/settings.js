define('two/Settings', [
    'Lockr'
], function (
    Lockr
) {
    var textObjectCommon = 'common'
    var noop = function () {}
    var hasOwn = Object.prototype.hasOwnProperty

    var generateDiff = function (before, after) {
        var changes = {}
        var id

        for (id in before) {
            if (hasOwn.call(after, id)) {
                if (!angular.equals(before[id], after[id])) {
                    changes[id] = after[id]
                }
            } else {
                changes[id] = before[id]
            }
        }

        return changes
    }

    var generateDefaults = function (map) {
        var key
        var defaults = {}

        for (key in map) {
            defaults[key] = map[key].default
        }

        return defaults
    }

    var disabledOption = function () {
        return {
            name: $filter('i18n')('disabled', $rootScope.loc.ale, textObjectCommon),
            value: false
        }
    }

    var Settings = function (configs) {
        this.settingsMap = configs.settingsMap
        this.storageKey = configs.storageKey
        this.defaults = generateDefaults(this.settingsMap)
        this.settings = Lockr.get(this.storageKey, this.defaults, true)
        this.events = {
            settingsChange: noop
        }
        this.injected = false
    }

    Settings.prototype.getSetting = function (id) {
        return this.settings[id]
    }

    Settings.prototype.getSettings = function () {
        return this.settings
    }

    Settings.prototype.getDefault = function (id) {
        return hasOwn.call(this.defaults, id) ? this.defaults[id] : undefined
    }

    Settings.prototype.store = function () {
        Lockr.set(this.storageKey, this.settings)
    }

    Settings.prototype.setSetting = function (id, value, opt) {
        var changes
        var before
        var after
        var update = false

        if (hasOwn.call(this.settingsMap, id)) {
            before = angular.copy(this.settings)
            this.settings[id] = value
            after = angular.copy(this.settings)
            changes = generateDiff(before, after)

            if (this.settingsMap[id].update) {
                update = true
            }

            this.store()
            this.updateInjectedScope()
            this.events.settingsChange(changes, update, opt || {})

            return true
        }

        return false
    }

    Settings.prototype.setSettings = function (values, opt) {
        var changes
        var before = angular.copy(this.settings)
        var after
        var update = false
        var id

        for (id in values) {
            if (hasOwn.call(this.settingsMap, id)) {
                this.settings[id] = values[id]

                if (!update && this.settingsMap[id].update) {
                    update = true
                }
            }
        }

        after = angular.copy(this.settings)
        changes = generateDiff(before, after)

        this.store()
        this.updateInjectedScope()
        this.events.settingsChange(changes, update, opt || {})

        return true
    }

    Settings.prototype.resetSetting = function (id, opt) {
        this.setSetting(id, this.defaults[id], opt)

        return true
    }

    Settings.prototype.resetSettings = function (opt) {
        this.setSettings(angular.copy(this.defaults), opt)

        return true
    }

    Settings.prototype.eachSetting = function (callback) {
        var id
        var value
        var map

        for (id in this.settings) {
            map = this.settingsMap[id]

            if (map.inputType === 'checkbox') {
                callback.call(this, id, !!this.settings[id], map)
            } else {
                callback.call(this, id, this.settings[id], map)
            }
        }
    }

    Settings.prototype.onSettingsChange = function (callback) {
        if (typeof callback === 'function') {
            this.events.settingsChange = callback
        }
    }

    Settings.prototype.injectSettings = function ($scope, opt) {
        var id
        var map

        this.injected = {
            $scope: $scope,
            opt: opt
        }

        $scope.settings = this.encodeSettings(opt)

        angular.forEach(this.settingsMap, function (map, id) {
            if (map.inputType === 'select') {
                $scope.$watch(function () {
                    return $scope.settings[id]
                }, function (value) {
                    if (map.multiSelect) {
                        if (!value.length) {
                            $scope.settings[id] = [disabledOption()]
                        }
                    } else if (!value) {
                        $scope.settings[id] = disabledOption()
                    }
                }, true)
            }
        })
    }

    Settings.prototype.updateInjectedScope = function () {
        if (!this.injected) {
            return false
        }
        
        this.injected.$scope.settings = this.encodeSettings(this.injected.opt)
    }

    Settings.prototype.encodeSettings = function (opt) {
        var encoded = {}
        var presets = modelDataService.getPresetList().getPresets()
        var groups = modelDataService.getGroupList().getGroups()
        var multiValues

        opt = opt || {}

        this.eachSetting(function (id, value, map) {
            if (map.inputType === 'select') {
                if (!value && map.disabledOption) {
                    encoded[id] = map.multiSelect ? [disabledOption()] : disabledOption()
                    return
                }

                switch (map.type) {
                case 'presets':
                    if (map.multiSelect) {
                        multiValues = []

                        value.forEach(function (presetId) {
                            if (!presets[presetId]) {
                                return
                            }

                            multiValues.push({
                                name: presets[presetId].name,
                                value: presetId
                            })
                        })

                        encoded[id] = multiValues.length ? multiValues : [disabledOption()]
                    } else {
                        if (!presets[value] && map.disabledOption) {
                            encoded[id] = disabledOption()
                            return
                        }

                        encoded[id] = {
                            name: presets[value].name,
                            value: value
                        }
                    }

                    break
                case 'groups':
                    if (map.multiSelect) {
                        multiValues = []

                        value.forEach(function (groupId) {
                            if (!groups[groupId]) {
                                return
                            }

                            multiValues.push({
                                name: groups[groupId].name,
                                value: groupId,
                                leftIcon: groups[groupId].icon
                            })
                        })

                        encoded[id] = multiValues.length ? multiValues : [disabledOption()]
                    } else {
                        if (!groups[value] && map.disabledOption) {
                            encoded[id] = disabledOption()
                            return
                        }

                        encoded[id] = {
                            name: groups[value].name,
                            value: value
                        }
                    }

                    break
                default:
                    encoded[id] = {
                        name: opt.textObject ? $filter('i18n')(value, $rootScope.loc.ale, opt.textObject) : value,
                        value: value
                    }

                    if (opt.multiSelect) {
                        encoded[id] = [encoded[id]]
                    }

                    break
                }
            } else {
                encoded[id] = value
            }
        })

        return encoded
    }

    Settings.prototype.decodeSettings = function (encoded) {
        var id
        var decoded = {}
        var multiValues
        var map

        for (id in encoded) {
            map = this.settingsMap[id]

            if (map.inputType === 'select') {
                if (map.multiSelect) {
                    if (encoded[id].length === 1 && encoded[id][0].value === false) {
                        decoded[id] = []
                    } else {
                        multiValues = []

                        encoded[id].forEach(function (item) {
                            multiValues.push(item.value)
                        })

                        decoded[id] = multiValues
                    }
                } else {
                    decoded[id] = encoded[id].value
                }
            } else {
                decoded[id] = encoded[id]
            }
        }

        return decoded
    }

    Settings.encodeList = function (list, opt) {
        var encoded = []
        var prop
        var value

        opt = opt || {}

        if (opt.disabled) {
            encoded.push(disabledOption())
        }

        switch (opt.type) {
        case 'keys':
            for (prop in list) {
                value = list[prop]

                encoded.push({
                    name: prop,
                    value: prop
                })
            }

            break
        case 'groups':
            for (prop in list) {
                value = list[prop]

                encoded.push({
                    name: value.name,
                    value: value.id,
                    leftIcon: value.icon
                })
            }

            break
        case 'presets':
            for (prop in list) {
                value = list[prop]

                encoded.push({
                    name: value.name,
                    value: value.id
                })
            }

            break
        case 'values':
        default:
            for (prop in list) {
                value = list[prop]

                encoded.push({
                    name: opt.textObject ? $filter('i18n')(value, $rootScope.loc.ale, opt.textObject) : value,
                    value: value
                })
            }
        }

        return encoded
    }

    Settings.disabledOption = disabledOption

    return Settings
})
