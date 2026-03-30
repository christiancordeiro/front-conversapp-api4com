export default async function handler(req, res) {
    const response = await fetch('https://api.api4com.com/api/v1/calls', {
        headers: { Authorization: process.env.API4COM_TOKEN },
    });
    const data = await response.json();
    res.status(200).json(data);
}