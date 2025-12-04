function calcular() {
    const ancho = parseFloat(document.getElementById("ancho").value);
    const largo = parseFloat(document.getElementById("largo").value);
    const pupilas = parseFloat(document.getElementById("pupilas").value);
    const nariz = parseFloat(document.getElementById("nariz").value);

    if (isNaN(ancho) || isNaN(largo) || isNaN(pupilas) || isNaN(nariz)) {
        document.getElementById("resultado").innerHTML = 
            "<p style='color:red'>Por favor completa todos los campos.</p>";
        return;
    }

    // Proporción áurea
    const PHI = 1.618;

    // Cálculos simples de "armonía"
    const proporcionCara = largo / ancho;
    const proporcionOjos = pupilas / nariz;

    // Puntajes entre 0 y 100
    const scoreCara = Math.max(0, 100 - Math.abs(PHI - proporcionCara) * 100);
    const scoreOjos = Math.max(0, 100 - Math.abs(PHI - proporcionOjos) * 100);

    const armonia = ((scoreCara + scoreOjos) / 2).toFixed(1);

    document.getElementById("resultado").innerHTML = `
        <h2>Resultados</h2>
        <p><strong>Proporción cara:</strong> ${proporcionCara.toFixed(2)}</p>
        <p><strong>Puntaje proporción cara:</strong> ${scoreCara.toFixed(1)}%</p>
        <p><strong>Proporción ojos/nariz:</strong> ${proporcionOjos.toFixed(2)}</p>
        <p><strong>Puntaje proporción ojos:</strong> ${scoreOjos.toFixed(1)}%</p>
        <hr>
        <h3>Armonía general: <span style="color:#4CAF50">${armonia}%</span></h3>
    `;
}
