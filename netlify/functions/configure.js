exports.handler = async (event) => {
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: `
            <h1>Configure Playlist</h1>
            <form action="/update-playlist" method="post">
                <label for="playlist">Enter M3U Link or Upload File:</label>
                <input type="text" name="playlist" id="playlist" placeholder="M3U Link">
                <input type="file" name="file" id="file">
                <button type="submit">Save</button>
            </form>
        `
    };
};