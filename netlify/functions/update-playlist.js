exports.handler = async (event) => {
    const formData = new URLSearchParams(event.body);
    const playlist = formData.get('playlist');
    // Save the playlist link or file for later use
    return {
        statusCode: 302,
        headers: { 'Location': '/' }
    };
};