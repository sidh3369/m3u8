exports.handler = async (event, context) => {
    return {
        statusCode: 200,
        body: JSON.stringify({
            id: 'org.vodplaylist',
            name: 'SID VOD Playlist',
            description: 'Watch your personal video playlist',
            version: '1.0.0',
            resources: ['catalog', 'meta', 'stream'],
            types: ['movie'],
            behaviorHints: { configurable: true }
        })
    };
};