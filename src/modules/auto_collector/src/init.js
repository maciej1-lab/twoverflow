require([
    'two/language',
    'two/ready',
    'two/autoCollector',
    'two/autoCollector/ui',
    'Lockr',
    'queues/EventQueue',
    'two/autoCollector/secondVillage',
    'two/autoCollector/events'
], function (
    twoLanguage,
    ready,
    autoCollector,
    autoCollectorInterface,
    Lockr,
    eventQueue
) {
    var STORAGE_KEYS = {
        ACTIVE: 'auto_collector_active'
    }

    if (autoCollector.isInitialized()) {
        return false
    }

    ready(function () {
        twoLanguage.add('__auto_collector_id', __auto_collector_lang)
        autoCollector.init()
        autoCollector.secondVillage.init()
        autoCollectorInterface()
        
        ready(function () {
            if (Lockr.get(STORAGE_KEYS.ACTIVE, false, true)) {
                autoCollector.start()
                autoCollector.secondVillage.start()
            }

            eventQueue.register(eventTypeProvider.AUTO_COLLECTOR_STARTED, function () {
                Lockr.set(STORAGE_KEYS.ACTIVE, true)
            })

            eventQueue.register(eventTypeProvider.AUTO_COLLECTOR_STOPPED, function () {
                Lockr.set(STORAGE_KEYS.ACTIVE, false)
            })
        }, ['initial_village'])
    })
})
