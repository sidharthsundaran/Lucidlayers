const getFormattedDate = (date) => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-based, so add 1
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

module.exports = getFormattedDate