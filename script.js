let fileDataList = [];

const fileButton = document.getElementById('fileButton');

fileButton.addEventListener('change', function (event) {
    const files = event.target.files;
    if (files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        const allText = e.target.result;

        fileDataList = allText.split('\n')
            .map(line => line.trim())
            .filter(line => line !== '');

        if (fileDataList.length === 0) {
            document.getElementById("continue").style.display = "none";
            alert("A kiválasztott fájl nem tartalmaz adatot!");
            return;
        } else {
            document.getElementById("continue").style.display = "block";
        }

        console.log("A fájlból beolvasott lista:", fileDataList);
        console.log("Első elem:", fileDataList[0]);
        console.log("Lista hossza:", fileDataList.length);
    };

    reader.readAsText(file);
});