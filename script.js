// Variables globales
let currentAnalysis = {};
let evaluationHistory = [];

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('fecha').valueAsDate = new Date();
});

// Navegación entre pestañas
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// Clase principal de análisis
class BodyAnalyzer {
    static calcularIMC(peso, estatura) {
        const estaturaM = estatura / 100;
        return peso / (estaturaM * estaturaM);
    }

    static calcularPorcentajeGrasa(sexo, edad, imc, cuello, cintura, cadera, estatura) {
        let porcentaje;
        const log10 = Math.log10;
        
        if (sexo === 'M') {
            porcentaje = 495 / (1.0324 - 0.19077 * log10(cintura - cuello) + 0.15456 * log10(estatura)) - 450;
        } else {
            porcentaje = 495 / (1.29579 - 0.35004 * log10(cintura + cadera - cuello) + 0.22100 * log10(estatura)) - 450;
        }
        
        return Math.max(3, Math.min(50, porcentaje));
    }

    static calcularFFMI(peso, estatura, porcentajeGrasa) {
        const estaturaM = estatura / 100;
        const masaMagra = peso * (1 - porcentajeGrasa / 100);
        return masaMagra / (estaturaM * estaturaM);
    }

    static calcularTMB(sexo, edad, peso, estatura) {
        if (sexo === 'M') {
            return 10 * peso + 6.25 * estatura - 5 * edad + 5;
        } else {
            return 10 * peso + 6.25 * estatura - 5 * edad - 161;
        }
    }
    // ============================================
    // NUEVO MÉTODO: CÁLCULO DE AGUA CORPORAL
    // ============================================
    static calcularAguaCorporal(sexo, edad, peso, estatura, masaMagraKg) {
        // Método 1: Ecuación de Watson (basada en regresión estadística)
        let watson;
        if (sexo === 'M') {
            watson = 2.447 - (0.09516 * edad) + (0.1074 * estatura) + (0.3362 * peso);
        } else {
            // Fórmula de Watson para mujeres
            watson = -2.097 + (0.1069 * estatura) + (0.2466 * peso);
        }
        
        // Método 2: Modelo fisiológico (73% de masa libre de grasa)
        const fisiologico = masaMagraKg * 0.73;
        
        // Método híbrido: promedio ponderado
        // 60% Watson (más preciso poblacionalmente)
        // 40% Fisiológico (coherencia con modelo 4 compartimentos)
        const hibrido = (watson * 0.6) + (fisiologico * 0.4);
        
        // Retornar objeto con los 3 métodos para transparencia
        return {
            watson: watson,
            fisiologico: fisiologico,
            valor: hibrido,  // Valor principal a usar
            porcentajePeso: (hibrido / peso) * 100
        };
    }
    
    // Cálculo de todas las proporciones antropométricas
    static calcularTodasLasProporciones(datos) {
        return {
            icc: datos.cintura / datos.cadera,
            whr: datos.cintura / datos.cadera,
            hombroCintura: datos.hombros / datos.cintura,
            brazoPecho: datos.brazo / datos.pecho,
            brazoCintura: datos.brazo / datos.cintura,
            brazoAntebrazo: datos.brazo / datos.antebrazo,
            piernaCadera: datos.muslo / datos.cadera,
            piernaCintura: datos.muslo / datos.cintura,
            pechoCintura: datos.pecho / datos.cintura,
            cuelloCintura: datos.cuello / datos.cintura,
            cinturaCandera: datos.cintura / datos.cadera,
            indiceMasaMuscular: this.calcularIndiceMasaMuscular(datos),
            indiceDefinicion: this.calcularIndiceDefinicion(datos),
            relacionTrenSuperior: this.calcularRelacionTrenSuperior(datos)
        };
    }

    static calcularIndiceMasaMuscular(datos) {
        const factorMasculino = datos.sexo === 'M' ? 1.0 : 0.85;
        const indice = ((datos.brazo + datos.pecho + datos.muslo + datos.pantorrilla) / datos.estatura) * 100 * factorMasculino;
        return indice;
    }

    static calcularIndiceDefinicion(datos) {
        const promedioPerifericos = (datos.hombros + datos.pecho + datos.brazo + datos.muslo) / 4;
        const indice = promedioPerifericos / datos.cintura;
        return indice;
    }

    static calcularRelacionTrenSuperior(datos) {
        const trenSuperior = (datos.hombros + datos.pecho + datos.brazo) / 3;
        const trenInferior = (datos.muslo + datos.pantorrilla) / 2;
        return trenSuperior / trenInferior;
    }

    static evaluarProporcion(valor, rangos) {
        if (valor >= rangos.excelente[0] && valor <= rangos.excelente[1]) {
            return { categoria: 'Excelente', color: 'excellent', score: 5 };
        } else if (valor >= rangos.bueno[0] && valor <= rangos.bueno[1]) {
            return { categoria: 'Bueno', color: 'good', score: 4 };
        } else if (valor >= rangos.promedio[0] && valor <= rangos.promedio[1]) {
            return { categoria: 'Promedio', color: 'average', score: 3 };
        } else {
            return { categoria: 'Fuera de rango', color: 'below', score: 2 };
        }
    }

    static obtenerRangosIdeales() {
        return {
            icc: { 
                excelente: [0.75, 0.85], 
                bueno: [0.70, 0.90], 
                promedio: [0.65, 0.95],
                descripcion: 'Índice Cintura-Cadera'
            },
            hombroCintura: { 
                excelente: [1.45, 1.60], 
                bueno: [1.35, 1.70], 
                promedio: [1.25, 1.80],
                descripcion: 'Relación Hombro-Cintura'
            },
            brazoPecho: { 
                excelente: [0.32, 0.38], 
                bueno: [0.28, 0.42], 
                promedio: [0.25, 0.45],
                descripcion: 'Proporción Brazo-Pecho'
            },
            brazoCintura: { 
                excelente: [0.42, 0.48], 
                bueno: [0.38, 0.52], 
                promedio: [0.35, 0.55],
                descripcion: 'Proporción Brazo-Cintura'
            },
            piernaCadera: { 
                excelente: [0.58, 0.65], 
                bueno: [0.55, 0.68], 
                promedio: [0.50, 0.72],
                descripcion: 'Proporción Pierna-Cadera'
            },
            brazoAntebrazo: { 
                excelente: [1.28, 1.38], 
                bueno: [1.20, 1.45], 
                promedio: [1.15, 1.50],
                descripcion: 'Relación Brazo-Antebrazo'
            },
            pechoCintura: { 
                excelente: [1.25, 1.35], 
                bueno: [1.15, 1.45], 
                promedio: [1.10, 1.50],
                descripcion: 'Relación Pecho-Cintura'
            },
            cuelloCintura: { 
                excelente: [0.42, 0.48], 
                bueno: [0.38, 0.52], 
                promedio: [0.35, 0.55],
                descripcion: 'Relación Cuello-Cintura'
            },
            piernaCintura: { 
                excelente: [0.68, 0.78], 
                bueno: [0.62, 0.85], 
                promedio: [0.58, 0.90],
                descripcion: 'Relación Pierna-Cintura'
            },
            indiceMasaMuscular: { 
                excelente: [80, 90], 
                bueno: [70, 95], 
                promedio: [60, 100],
                descripcion: 'Índice de Masa Muscular'
            },
            indiceDefinicion: { 
                excelente: [22, 26], 
                bueno: [20, 28], 
                promedio: [18, 30],
                descripcion: 'Índice de Definición'
            },
            relacionTrenSuperior: { 
                excelente: [1.30, 1.40], 
                bueno: [1.20, 1.50], 
                promedio: [1.10, 1.60],
                descripcion: 'Relación Tren Superior'
            }
        };
    }

    static calcularMacronutrientes(peso, objetivo, calorias, ffmi) {
        let proteinas, carbohidratos, grasas;
        
        if (ffmi > 22) {
            proteinas = peso * 2.4;
        } else if (ffmi > 20) {
            proteinas = peso * 2.2;
        } else {
            proteinas = peso * 2.0;
        }

        switch(objetivo) {
            case 'definicion':
                proteinas = peso * 2.6;
                grasas = peso * 0.7;
                break;
            case 'hipertrofia':
                grasas = peso * 1.1;
                break;
            case 'fuerza':
                proteinas = peso * 2.3;
                grasas = peso * 1.0;
                break;
            case 'recomposicion':
                proteinas = peso * 2.5;
                grasas = peso * 0.8;
                break;
            default:
                grasas = peso * 0.9;
        }
        
        carbohidratos = (calorias - (proteinas * 4) - (grasas * 9)) / 4;
        
        return {
            proteinas: Math.round(proteinas),
            carbohidratos: Math.round(Math.max(80, carbohidratos)),
            grasas: Math.round(Math.max(25, grasas))
        };
    }

    static evaluarComposicionCorporal(datos, resultados) {
        const evaluacion = {
            imc: this.evaluarIMC(resultados.imc),
            grasa: this.evaluarGrasaCorporal(resultados.porcentajeGrasa, datos.sexo, datos.edad),
            ffmi: this.evaluarFFMI(resultados.ffmi, datos.sexo),
            proporciones: this.evaluarProporciones(datos),
            riesgoMetabolico: this.evaluarRiesgoMetabolico(resultados.icc, datos.sexo)
        };
        
        return evaluacion;
    }

    static evaluarIMC(imc) {
        if (imc < 18.5) return { categoria: 'Bajo peso', color: 'warning', score: 2 };
        if (imc < 25) return { categoria: 'Normal', color: 'success', score: 5 };
        if (imc < 30) return { categoria: 'Sobrepeso', color: 'warning', score: 3 };
        return { categoria: 'Obesidad', color: 'danger', score: 1 };
    }

    static evaluarGrasaCorporal(grasa, sexo, edad) {
        const rangos = sexo === 'M' ? 
            { excelente: 10, bueno: 15, promedio: 20, alto: 25 } :
            { excelente: 16, bueno: 20, promedio: 25, alto: 30 };

        if (grasa <= rangos.excelente) return { categoria: 'Excelente', color: 'success', score: 5 };
        if (grasa <= rangos.bueno) return { categoria: 'Bueno', color: 'success', score: 4 };
        if (grasa <= rangos.promedio) return { categoria: 'Promedio', color: 'warning', score: 3 };
        if (grasa <= rangos.alto) return { categoria: 'Alto', color: 'warning', score: 2 };
        return { categoria: 'Muy alto', color: 'danger', score: 1 };
    }

    static evaluarFFMI(ffmi, sexo) {
        const limite = sexo === 'M' ? 25 : 22;
        const bueno = sexo === 'M' ? 20 : 18;
        const promedio = sexo === 'M' ? 17 : 15;

        if (ffmi >= limite) return { categoria: 'Elite natural', color: 'success', score: 5 };
        if (ffmi >= bueno) return { categoria: 'Muy bueno', color: 'success', score: 4 };
        if (ffmi >= promedio) return { categoria: 'Promedio', color: 'warning', score: 3 };
        return { categoria: 'Bajo desarrollo', color: 'warning', score: 2 };
    }

    static evaluarProporciones(datos) {
        const proporciones = this.calcularTodasLasProporciones(datos);
        const rangos = this.obtenerRangosIdeales();
        
        const evaluaciones = {};
        for (const [key, valor] of Object.entries(proporciones)) {
            if (rangos[key]) {
                evaluaciones[key] = {
                    valor: valor,
                    ...this.evaluarProporcion(valor, rangos[key]),
                    ...rangos[key]
                };
            }
        }

        return evaluaciones;
    }

    static evaluarRiesgoMetabolico(icc, sexo) {
        const limite = sexo === 'M' ? 0.9 : 0.8;
        const bueno = sexo === 'M' ? 0.85 : 0.75;

        if (icc <= bueno) return { categoria: 'Bajo riesgo', color: 'success', score: 5 };
        if (icc <= limite) return { categoria: 'Riesgo moderado', color: 'warning', score: 3 };
        return { categoria: 'Alto riesgo', color: 'danger', score: 1 };
    }
}

// Función principal de análisis
function calcularAnalisisCompleto() {
    try {
        const datos = obtenerDatosCompletos();
        if (!validarDatosCompletos(datos)) return;

        const resultados = realizarCalculosAvanzados(datos);
        const evaluacion = BodyAnalyzer.evaluarComposicionCorporal(datos, resultados);
        
        currentAnalysis = { ...datos, ...resultados, evaluacion };
        
        mostrarAnalisisDetallado(currentAnalysis);
        mostrarAnalisisProporciones(currentAnalysis);
        mostrarPlanNutricional(currentAnalysis);
        mostrarProgramaEntrenamiento(currentAnalysis);
        
        showTab('analysis');
        mostrarNotificacion('Análisis completo realizado exitosamente', 'success');
        
    } catch (error) {
        mostrarNotificacion('Error en el análisis: ' + error.message, 'error');
    }
}

function obtenerDatosCompletos() {
    return {
        nombre: document.getElementById('nombre').value || 'Cliente',
        edad: parseInt(document.getElementById('edad').value),
        sexo: document.getElementById('sexo').value,
        fecha: document.getElementById('fecha').value,
        experiencia: document.getElementById('experiencia').value,
        objetivo: document.getElementById('objetivo').value,
        actividad: document.getElementById('actividad').value,
        peso: parseFloat(document.getElementById('peso').value),
        estatura: parseFloat(document.getElementById('estatura').value),
        cintura: parseFloat(document.getElementById('cintura').value),
        cadera: parseFloat(document.getElementById('cadera').value),
        cuello: parseFloat(document.getElementById('cuello').value),
        hombros: parseFloat(document.getElementById('hombros').value),
        pecho: parseFloat(document.getElementById('pecho').value),
        brazo: parseFloat(document.getElementById('brazo').value),
        antebrazo: parseFloat(document.getElementById('antebrazo').value),
        muslo: parseFloat(document.getElementById('muslo').value),
        pantorrilla: parseFloat(document.getElementById('pantorrilla').value),
        grasaEstimada: parseFloat(document.getElementById('grasaEstimada').value) || null
    };
}

function validarDatosCompletos(datos) {
    const required = ['peso', 'estatura', 'edad', 'cintura', 'cuello', 'cadera'];
    
    for (let field of required) {
        if (!datos[field] || isNaN(datos[field]) || datos[field] <= 0) {
            mostrarNotificacion(`El campo ${field} es requerido y debe ser válido`, 'warning');
            return false;
        }
    }
    
    if (datos.edad < 15 || datos.edad > 80) {
        mostrarNotificacion('La edad debe estar entre 15 y 80 años', 'warning');
        return false;
    }
    
    return true;
}

function realizarCalculosAvanzados(datos) {
    const imc = BodyAnalyzer.calcularIMC(datos.peso, datos.estatura);
    const icc = datos.cintura / datos.cadera;
    
    const porcentajeGrasa = datos.grasaEstimada || 
        BodyAnalyzer.calcularPorcentajeGrasa(datos.sexo, datos.edad, imc, datos.cuello, datos.cintura, datos.cadera, datos.estatura);
    
    const ffmi = BodyAnalyzer.calcularFFMI(datos.peso, datos.estatura, porcentajeGrasa);
    const tmb = BodyAnalyzer.calcularTMB(datos.sexo, datos.edad, datos.peso, datos.estatura);
    
    // ============================================
    // COMPOSICIÓN CORPORAL MULTICOMPARTIMENTAL
    // ============================================
    const masaGrasaKg = datos.peso * (porcentajeGrasa / 100);
    const masaMagraKg = datos.peso - masaGrasaKg;
    
    // COMPONENTES BASADOS EN PESO CORPORAL TOTAL
    const masaOsea = datos.peso * 0.07;      // 7% del peso total
    const organos = datos.peso * 0.026;      // 2.6% del peso total
    
    // COMPONENTES BASADOS EN MASA LIBRE DE GRASA
    const masaMuscularEsqueletica = masaMagraKg * 0.43;  // 43% de MLG
    
    // AGUA CORPORAL: Método híbrido (Watson + Fisiológico)
    const aguaData = BodyAnalyzer.calcularAguaCorporal(
        datos.sexo, 
        datos.edad, 
        datos.peso, 
        datos.estatura, 
        masaMagraKg
    );
    
    const aguaCorporal = aguaData.valor;  // Valor híbrido
    const aguaIntracelular = aguaCorporal * 0.6;   // 60% del TBW
    const aguaExtracelular = aguaCorporal * 0.4;   // 40% del TBW
    
    // Guardar métodos individuales para transparencia en reporte
    const aguaCorporalWatson = aguaData.watson;
    const aguaCorporalFisiologico = aguaData.fisiologico;
    
    // ... resto del código (factores de actividad, etc) sin cambios ...
    
    const factores = {
        sedentario: 1.2,
        ligera: 1.375,
        moderada: 1.55,
        intensa: 1.725,
        extrema: 1.9
    };
    
    const factorActividad = factores[datos.actividad] || factores.moderada;
    const caloriaMantenimiento = tmb * factorActividad;
    
    let ajusteCalorico = 0;
    switch(datos.objetivo) {
        case 'definicion':
            ajusteCalorico = -500;
            break;
        case 'hipertrofia':
            ajusteCalorico = 300;
            break;
        case 'fuerza':
            ajusteCalorico = 200;
            break;
        case 'recomposicion':
            ajusteCalorico = -200;
            break;
    }
    
    const caloriasObjetivo = caloriaMantenimiento + ajusteCalorico;
    const macros = BodyAnalyzer.calcularMacronutrientes(datos.peso, datos.objetivo, caloriasObjetivo, ffmi);
    
    const proporciones = BodyAnalyzer.calcularTodasLasProporciones(datos);
    
    return {
        imc,
        icc,
        porcentajeGrasa,
        ffmi,
        tmb,
        masaGrasaKg,
        masaMagraKg,
        masaMuscularEsqueletica,
        aguaCorporal,              // Valor híbrido principal
        aguaCorporalWatson,        // Para reporte detallado
        aguaCorporalFisiologico,   // Para reporte detallado
        aguaIntracelular,
        aguaExtracelular,
        masaOsea,
        organos,
        caloriaMantenimiento,
        caloriasObjetivo,
        ...macros,
        proporciones
    };
}

function mostrarAnalisisDetallado(analysis) {
    const container = document.getElementById('analysisResults');
    
    container.innerHTML = `
       <div class="card">
    <div class="card-header">
        <div class="card-icon">⚖️</div>
        <h2 class="card-title">Composición Corporal Multicompartimental</h2>
    </div>
    
    <div class="alert alert-info">
        <strong>Modelo independiente:</strong> Los componentes NO suman 100% porque se superponen.
        El agua (73% MLG) está contenida dentro de músculos, huesos y órganos.
    </div>
    
    <div class="metrics-grid">
        <div class="metric-card">
            <div class="metric-label">💪 Masa Muscular Esquelética</div>
            <div class="metric-value">${analysis.masaMuscularEsqueletica.toFixed(1)}</div>
            <div class="metric-unit">kg (${((analysis.masaMuscularEsqueletica / analysis.peso) * 100).toFixed(1)}% peso)</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">💧 Agua Corporal Total</div>
            <div class="metric-value">${analysis.aguaCorporal.toFixed(1)}</div>
            <div class="metric-unit">kg (${((analysis.aguaCorporal / analysis.peso) * 100).toFixed(1)}% peso)</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">🦴 Masa Ósea</div>
            <div class="metric-value">${analysis.masaOsea.toFixed(1)}</div>
            <div class="metric-unit">kg (${((analysis.masaOsea / analysis.peso) * 100).toFixed(1)}% peso)</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">⚙️ Órganos Vitales</div>
            <div class="metric-value">${analysis.organos.toFixed(1)}</div>
            <div class="metric-unit">kg (${((analysis.organos / analysis.peso) * 100).toFixed(1)}% peso)</div>
        </div>
    </div>
    
    <div class="advanced-analysis" style="margin-top: 20px;">
    <h3>Distribución del Agua Corporal</h3>
    <div class="metrics-grid">
        <div class="metric-card">
            <div class="metric-label">Agua Total (Híbrido)</div>
            <div class="metric-value">${analysis.aguaCorporal.toFixed(1)}</div>
            <div class="metric-unit">L (${((analysis.aguaCorporal / analysis.peso) * 100).toFixed(1)}%)</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Agua Intracelular</div>
            <div class="metric-value">${analysis.aguaIntracelular.toFixed(1)}</div>
            <div class="metric-unit">L (60% TBW)</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Agua Extracelular</div>
            <div class="metric-value">${analysis.aguaExtracelular.toFixed(1)}</div>
            <div class="metric-unit">L (40% TBW)</div>
        </div>
    </div>
    
    <div class="alert alert-info" style="margin-top: 15px;">
        <strong>Métodos de cálculo:</strong><br>
        • Watson: ${analysis.aguaCorporalWatson?.toFixed(1) || 'N/A'} L (ecuación estadística)<br>
        • Fisiológico: ${analysis.aguaCorporalFisiologico?.toFixed(1) || 'N/A'} L (73% MLG)<br>
        • Valor usado: ${analysis.aguaCorporal.toFixed(1)} L (promedio ponderado 60/40)
    </div>
</div>

        <div class="card">
            <div class="card-header">
                <div class="card-icon">⚖️</div>
                <h2 class="card-title">Composición Corporal Detallada</h2>
            </div>
            
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-label">Masa Muscular Esquelética</div>
                    <div class="metric-value">${analysis.masaMuscularEsqueletica.toFixed(1)}</div>
                    <div class="metric-unit">kg (43%)</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Agua Corporal Total</div>
                    <div class="metric-value">${analysis.aguaCorporal.toFixed(1)}</div>
                    <div class="metric-unit">kg (42%)</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Masa Ósea</div>
                    <div class="metric-value">${analysis.masaOsea.toFixed(1)}</div>
                    <div class="metric-unit">kg (12%)</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Órganos</div>
                    <div class="metric-value">${analysis.organos.toFixed(1)}</div>
                    <div class="metric-unit">kg (3%)</div>
                </div>
            </div>
        </div>

        <div class="advanced-analysis">
            <h3>Evaluación Profesional y Conclusiones</h3>
            <div class="analysis-grid">
                <div class="analysis-item">
                    <h4>Estado de Composición Corporal</h4>
                    <div class="alert alert-${analysis.evaluacion.grasa.color}">
                        <strong>${analysis.evaluacion.grasa.categoria}</strong>
                        <br>Grasa corporal: ${analysis.porcentajeGrasa.toFixed(1)}% 
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${analysis.evaluacion.grasa.color === 'success' ? '' : analysis.evaluacion.grasa.color}" 
                             style="width: ${analysis.evaluacion.grasa.score * 20}%"></div>
                    </div>
                </div>

                <div class="analysis-item">
                    <h4>Desarrollo Muscular (FFMI)</h4>
                    <div class="alert alert-${analysis.evaluacion.ffmi.color}">
                        <strong>${analysis.evaluacion.ffmi.categoria}</strong>
                        <br>FFMI: ${analysis.ffmi.toFixed(1)} kg/m²
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${analysis.evaluacion.ffmi.score * 20}%"></div>
                    </div>
                </div>

                <div class="analysis-item">
                    <h4>Riesgo Metabólico</h4>
                    <div class="alert alert-${analysis.evaluacion.riesgoMetabolico.color}">
                        <strong>${analysis.evaluacion.riesgoMetabolico.categoria}</strong>
                        <br>ICC: ${analysis.icc.toFixed(2)}
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${analysis.evaluacion.riesgoMetabolico.color === 'success' ? '' : 'warning'}" 
                             style="width: ${analysis.evaluacion.riesgoMetabolico.score * 20}%"></div>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top: 30px;">
                <div class="card-header">
                    <div class="card-icon">📋</div>
                    <h3 class="card-title">Conclusiones Profesionales</h3>
                </div>
                ${generarConclusionesDetalladas(analysis)}
            </div>
        </div>
    `;
}

function generarConclusionesDetalladas(analysis) {
    let conclusiones = '';
    let recomendaciones = '';
    let alertas = '';

    // Análisis de composición corporal
    if (analysis.porcentajeGrasa > 20 && analysis.sexo === 'M') {
        conclusiones += `El análisis revela un porcentaje de grasa corporal elevado (${analysis.porcentajeGrasa.toFixed(1)}%) que requiere intervención prioritaria. `;
        recomendaciones += 'Implementar déficit calórico controlado con énfasis en preservación muscular. ';
        alertas += 'PRIORIDAD: Reducción de grasa corporal. ';
    } else if (analysis.porcentajeGrasa > 25 && analysis.sexo === 'F') {
        conclusiones += `El porcentaje de grasa corporal (${analysis.porcentajeGrasa.toFixed(1)}%) se encuentra por encima del rango óptimo para deportistas. `;
        recomendaciones += 'Protocolo de definición con cardio estratégico y entrenamiento de resistencia. ';
    }

    // Análisis de desarrollo muscular
    if (analysis.ffmi < 18) {
        conclusiones += `El FFMI de ${analysis.ffmi.toFixed(1)} kg/m² indica potencial significativo para desarrollo muscular. `;
        recomendaciones += 'Fase de volumen con superávit calórico y entrenamiento de hipertrofia. ';
        alertas += 'OPORTUNIDAD: Ganancia de masa muscular. ';
    } else if (analysis.ffmi > 23) {
        conclusiones += `Desarrollo muscular excepcional con FFMI de ${analysis.ffmi.toFixed(1)} kg/m², indicando dedicación y genética favorable. `;
        recomendaciones += 'Mantenimiento o recomposición corporal con periodización avanzada. ';
    }

    // Análisis de distribución de masa magra
    const porcentajeMuscular = (analysis.masaMuscularEsqueletica / analysis.masaMagraKg) * 100;
    if (porcentajeMuscular < 40) {
        conclusiones += `La distribución de masa magra muestra oportunidades de mejora en el componente muscular esquelético. `;
        recomendaciones += 'Incrementar volumen de entrenamiento de resistencia y optimizar síntesis proteica. ';
    }

    // Análisis de hidratación
    const porcentajeAgua = (analysis.aguaCorporal / analysis.peso) * 100;
    if (porcentajeAgua < 50) {
        alertas += 'ATENCIÓN: Posible deshidratación crónica. ';
        recomendaciones += 'Incrementar ingesta hídrica a 35-40ml/kg peso corporal diario. ';
    }

    // Riesgo metabólico
    if (analysis.icc > 0.9) {
        alertas += 'ALERTA: Alto riesgo metabólico por distribución de grasa abdominal. ';
        recomendaciones += 'Priorizar pérdida de grasa visceral mediante ejercicio aeróbico y dieta antiinflamatoria. ';
    }
    
    // ========================================
    // NUEVA SECCIÓN: Estado Integral
    // ========================================
    const porcentajeOsea = (analysis.masaOsea / analysis.peso) * 100;
    
    let estadoIntegral = '';
    
    // Clasificación del perfil
    if (analysis.ffmi >= 22 && analysis.porcentajeGrasa <= 12) {
        estadoIntegral = 'PERFIL ATLÉTICO ÉLITE: Composición corporal excepcional con alta masa muscular y baja adiposidad.';
    } else if (analysis.ffmi >= 20 && analysis.porcentajeGrasa <= 15) {
        estadoIntegral = 'PERFIL DEPORTIVO AVANZADO: Desarrollo muscular sólido con composición corporal favorable.';
    } else if (analysis.ffmi >= 18 && analysis.porcentajeGrasa <= 18) {
        estadoIntegral = 'PERFIL INTERMEDIO: Base muscular adecuada con margen de optimización en definición.';
    } else if (analysis.ffmi < 18 && analysis.porcentajeGrasa <= 20) {
        estadoIntegral = 'PERFIL EN DESARROLLO: Potencial significativo para ganancia de masa muscular.';
    } else if (analysis.porcentajeGrasa > 20 && analysis.ffmi < 18) {
        estadoIntegral = 'PERFIL INICIAL: Requiere enfoque dual en reducción de adiposidad y desarrollo muscular.';
    } else {
        estadoIntegral = 'PERFIL MIXTO: Composición corporal con múltiples áreas de optimización.';
    }

    // Evaluación hidratación
    let estadoHidratacion = '';
    if (porcentajeAgua < 50) {
        estadoHidratacion = 'Hidratación subóptima detectada.';
    } else if (porcentajeAgua >= 55 && porcentajeAgua <= 65) {
        estadoHidratacion = 'Hidratación óptima.';
    } else if (porcentajeAgua > 65) {
        estadoHidratacion = 'Hidratación elevada, evaluar retención.';
    } else {
        estadoHidratacion = 'Hidratación en rango aceptable.';
    }

    // Evaluación densidad ósea
    let estadoOseo = '';
    if (porcentajeOsea < 6) {
        estadoOseo = 'Densidad mineral ósea por debajo del rango ideal.';
    } else if (porcentajeOsea >= 6 && porcentajeOsea <= 8) {
        estadoOseo = 'Estructura ósea saludable.';
    } else {
        estadoOseo = 'Densidad ósea en límite superior.';
    }

  return `
        <div class="alert alert-success" style="border-left: 4px solid #059669;">
            <h4>Estado Integral Identificado</h4>
            <p style="font-size: 1.05em; margin: 10px 0;">
                <strong>${estadoIntegral}</strong>
            </p>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-top: 15px;">
                <div style="background: #f0fdf4; padding: 10px; border-radius: 8px; border: 1px solid #86efac;">
                    <strong>Hidratación:</strong> ${porcentajeAgua.toFixed(1)}%<br>
                    <small>${estadoHidratacion}</small>
                </div>
                <div style="background: #fef3c7; padding: 10px; border-radius: 8px; border: 1px solid #fcd34d;">
                    <strong>Musculatura:</strong> ${(analysis.masaMuscularEsqueletica / analysis.peso * 100).toFixed(1)}%<br>
                    <small>FFMI: ${analysis.ffmi.toFixed(1)} kg/m²</small>
                </div>
                <div style="background: #e0e7ff; padding: 10px; border-radius: 8px; border: 1px solid #a5b4fc;">
                    <strong>Densidad Ósea:</strong> ${porcentajeOsea.toFixed(1)}%<br>
                    <small>${estadoOseo}</small>
                </div>
                <div style="background: #fee2e2; padding: 10px; border-radius: 8px; border: 1px solid #fca5a5;">
                    <strong>Adiposidad:</strong> ${analysis.porcentajeGrasa.toFixed(1)}%<br>
                    <small>IMC: ${analysis.imc.toFixed(1)} kg/m²</small>
                </div>
            </div>

            <div style="margin-top: 15px; padding: 12px; background: #f8fafc; border-radius: 8px; border-left: 3px solid #3b82f6;">
                <strong>Interpretación Clínica:</strong><br>
                <small>
                    ${analysis.porcentajeGrasa < 15 && analysis.sexo === 'M' ? 
                        'Composición favorable para rendimiento deportivo. Priorizar mantenimiento y ganancia muscular.' :
                    analysis.porcentajeGrasa < 20 && analysis.sexo === 'F' ?
                        'Composición atlética óptima. Enfoque en desarrollo de fuerza y potencia.' :
                    analysis.porcentajeGrasa > 20 ?
                        'Margen de mejora en definición corporal. Implementar déficit calórico moderado con preservación de masa magra.' :
                        'Composición equilibrada. Ajustar protocolo según objetivos específicos.'}
                </small>
            </div>

            <div style="margin-top: 10px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                <div style="text-align: center; padding: 8px; background: ${analysis.icc < 0.9 ? '#dcfce7' : '#fef2f2'}; border-radius: 6px;">
                    <small><strong>ICC:</strong> ${analysis.icc.toFixed(2)}</small><br>
                    <small style="font-size: 0.85em;">${analysis.icc < 0.9 ? 'Bajo riesgo' : 'Revisar'}</small>
                </div>
                <div style="text-align: center; padding: 8px; background: ${porcentajeAgua >= 55 && porcentajeAgua <= 65 ? '#dcfce7' : '#fef9c3'}; border-radius: 6px;">
                    <small><strong>TBW:</strong> ${porcentajeAgua.toFixed(1)}%</small><br>
                    <small style="font-size: 0.85em;">${porcentajeAgua >= 55 && porcentajeAgua <= 65 ? 'Óptimo' : 'Ajustar'}</small>
                </div>
                <div style="text-align: center; padding: 8px; background: ${analysis.ffmi >= 18 ? '#dcfce7' : '#fef9c3'}; border-radius: 6px;">
                    <small><strong>Desarrollo:</strong> ${analysis.evaluacion.ffmi.categoria}</small><br>
                    <small style="font-size: 0.85em;">${analysis.ffmi >= 20 ? 'Excelente' : 'Potencial'}</small>
                </div>
            </div>

            <div style="margin-top: 15px; padding: 10px; background: white; border-radius: 6px; border: 1px solid #d1d5db;">
                <small><strong>Enfoque prioritario próximos 30 días:</strong></small><br>
                <small>
                    ${analysis.porcentajeGrasa > 18 && analysis.sexo === 'M' ?
                        'Déficit calórico -300kcal - Cardio LISS 3x/sem - Mantener fuerza' :
                    analysis.ffmi < 18 ?
                        'Superávit +200kcal - Volumen 16-20 series/grupo - Progresión cargas' :
                    analysis.proporciones.relacionTrenSuperior > 1.4 ?
                        'Frecuencia piernas 3x/sem - Volumen piernas +30% - Sentadilla/peso muerto' :
                        'Mantenimiento calórico - Periodización ondulante - Optimizar recuperación'}
                </small>
            </div>
        </div>
        
        <div class="alert alert-info">
            <h4>Análisis Integral</h4>
            <p><strong>Composición Corporal:</strong> ${conclusiones}</p>
            <p><strong>Distribución de Masa Magra:</strong></p>
            <ul style="margin: 10px 0;">
                <li>Masa Muscular Esquelética: ${analysis.masaMuscularEsqueletica.toFixed(1)} kg (43% de masa magra)</li>
                <li>Agua Corporal: ${analysis.aguaCorporal.toFixed(1)} kg (73% de masa magra) - ${porcentajeAgua.toFixed(1)}% del peso total</li>
                <li>Masa Ósea: ${analysis.masaOsea.toFixed(1)} kg (7% del peso total)</li>
                <li>Órganos: ${analysis.organos.toFixed(1)} kg (2.6% del peso total)</li>
            </ul>
        </div>
        ${alertas ? `<div class="alert alert-warning">
            <h4>Alertas Importantes</h4>
            <p>${alertas}</p>
        </div>` : ''}
        <div class="alert alert-success">
            <h4>Recomendaciones Profesionales</h4>
            <p>${recomendaciones}</p>
            <p><strong>Seguimiento:</strong> Evaluación cada 4-6 semanas para monitorear cambios en composición corporal y ajustar protocolo según progreso.</p>
        </div>
    `;
}
function mostrarAnalisisProporciones(analysis) {
    const container = document.getElementById('proportionsResults');
    const proporciones = analysis.evaluacion.proporciones;
    
    let proporcionesHTML = '';
    
    for (const [key, data] of Object.entries(proporciones)) {
        proporcionesHTML += `
            <div class="proportion-card">
                <div class="proportion-title">${data.descripcion}</div>
                <div class="proportion-value">${data.valor.toFixed(2)}</div>
                <div class="proportion-range">Ideal: ${data.excelente[0]} - ${data.excelente[1]}</div>
                <span class="proportion-status ${data.color}">${data.categoria}</span>
            </div>
        `;
    }
    
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-icon">📐</div>
                <h2 class="card-title">Análisis Completo de Proporciones Antropométricas</h2>
            </div>
            
            <div class="proportions-grid">
                ${proporcionesHTML}
            </div>
            
            <div class="advanced-analysis">
                <h3>Métricas Especializadas</h3>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-label">Índice Masa Muscular</div>
                        <div class="metric-value">${analysis.proporciones.indiceMasaMuscular.toFixed(2)}</div>
                        <div class="metric-unit">IMM</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Índice Definición</div>
                        <div class="metric-value">${analysis.proporciones.indiceDefinicion.toFixed(2)}</div>
                        <div class="metric-unit">ID</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Relación Tren Superior</div>
                        <div class="metric-value">${analysis.proporciones.relacionTrenSuperior.toFixed(2)}</div>
                        <div class="metric-unit">RTS</div>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top: 30px;">
                <div class="card-header">
                    <div class="card-icon">📊</div>
                    <h3 class="card-title">Resumen de Ratios Antropométricos</h3>
                </div>
                <div class="comparison-table">
                    <div class="comparison-header">Ratio</div>
                    <div class="comparison-header">Valor Actual</div>
                    <div class="comparison-header">Rango Ideal</div>
                    <div class="comparison-header">Evaluación</div>
                    
                    <div class="comparison-cell">ICC (Cintura/Cadera)</div>
                    <div class="comparison-cell">${analysis.proporciones.icc.toFixed(2)}</div>
                    <div class="comparison-cell">0.75-0.85</div>
                    <div class="comparison-cell ${proporciones.icc.color}">${proporciones.icc.categoria}</div>
                    
                    <div class="comparison-cell">WHR (Hombro/Cintura)</div>
                    <div class="comparison-cell">${analysis.proporciones.hombroCintura.toFixed(2)}</div>
                    <div class="comparison-cell">1.45-1.60</div>
                    <div class="comparison-cell ${proporciones.hombroCintura.color}">${proporciones.hombroCintura.categoria}</div>
                    
                    <div class="comparison-cell">Brazo/Pecho</div>
                    <div class="comparison-cell">${analysis.proporciones.brazoPecho.toFixed(2)}</div>
                    <div class="comparison-cell">0.32-0.38</div>
                    <div class="comparison-cell ${proporciones.brazoPecho.color}">${proporciones.brazoPecho.categoria}</div>
                    
                    <div class="comparison-cell">Brazo/Cintura</div>
                    <div class="comparison-cell">${analysis.proporciones.brazoCintura.toFixed(2)}</div>
                    <div class="comparison-cell">0.42-0.48</div>
                    <div class="comparison-cell ${proporciones.brazoCintura.color}">${proporciones.brazoCintura.categoria}</div>
                    
                    <div class="comparison-cell">Pierna/Cadera</div>
                    <div class="comparison-cell">${analysis.proporciones.piernaCadera.toFixed(2)}</div>
                    <div class="comparison-cell">0.58-0.65</div>
                    <div class="comparison-cell ${proporciones.piernaCadera.color}">${proporciones.piernaCadera.categoria}</div>
                    
                    <div class="comparison-cell">Brazo/Antebrazo</div>
                    <div class="comparison-cell">${analysis.proporciones.brazoAntebrazo.toFixed(2)}</div>
                    <div class="comparison-cell">1.28-1.38</div>
                    <div class="comparison-cell ${proporciones.brazoAntebrazo.color}">${proporciones.brazoAntebrazo.categoria}</div>
                    
                    <div class="comparison-cell">Pecho/Cintura</div>
                    <div class="comparison-cell">${analysis.proporciones.pechoCintura.toFixed(2)}</div>
                    <div class="comparison-cell">1.25-1.35</div>
                    <div class="comparison-cell ${proporciones.pechoCintura.color}">${proporciones.pechoCintura.categoria}</div>
                    
                    <div class="comparison-cell">Cuello/Cintura</div>
                    <div class="comparison-cell">${analysis.proporciones.cuelloCintura.toFixed(2)}</div>
                    <div class="comparison-cell">0.42-0.48</div>
                    <div class="comparison-cell ${proporciones.cuelloCintura.color}">${proporciones.cuelloCintura.categoria}</div>
                    
                    <div class="comparison-cell">Pierna/Cintura</div>
                    <div class="comparison-cell">${analysis.proporciones.piernaCintura.toFixed(2)}</div>
                    <div class="comparison-cell">0.68-0.78</div>
                    <div class="comparison-cell ${proporciones.piernaCintura.color}">${proporciones.piernaCintura.categoria}</div>
                </div>
            </div>

            <div class="card" style="margin-top: 30px;">
                <div class="card-header">
                    <div class="card-icon">📋</div>
                    <h3 class="card-title">Conclusiones y Recomendaciones Antropométricas</h3>
                </div>
                ${generarConclusionesAntropometricas(analysis)}
            </div>
        </div>
    `;
}

function generarConclusionesAntropometricas(analysis) {
    const proporciones = analysis.evaluacion.proporciones;
    let fortalezas = [];
    let debilidades = [];
    let recomendaciones = [];

    // Evaluar cada proporción
    for (const [key, data] of Object.entries(proporciones)) {
        if (data.score >= 4) {
            fortalezas.push(data.descripcion);
        } else if (data.score <= 2) {
            debilidades.push(data.descripcion);
        }
    }

    // Análisis específico de desequilibrios
    if (analysis.proporciones.relacionTrenSuperior > 1.4) {
        debilidades.push("Desequilibrio tren superior dominante");
        recomendaciones.push("Priorizar entrenamiento de piernas y glúteos");
        recomendaciones.push("Incrementar volumen de sentadillas, peso muerto y variantes");
    } else if (analysis.proporciones.relacionTrenSuperior < 1.1) {
        debilidades.push("Tren superior subdesarrollado");
        recomendaciones.push("Enfoque en desarrollo de hombros, pecho y brazos");
    }

    if (analysis.proporciones.hombroCintura < 1.4) {
        debilidades.push("Hombros estrechos relativos a cintura");
        recomendaciones.push("Entrenamiento específico de deltoides laterales y posteriores");
        recomendaciones.push("Incluir elevaciones laterales y remo con agarre amplio");
    }

    if (analysis.proporciones.brazoPecho < 0.30) {
        debilidades.push("Brazos subdesarrollados relativos al pecho");
        recomendaciones.push("Incrementar volumen de entrenamiento de brazos");
        recomendaciones.push("Agregar días específicos de brazos al programa");
    }

    // Análisis de simetría
    let simetria = "favorable";
    if (Math.abs(analysis.proporciones.hombroCintura - 1.5) > 0.2) {
        simetria = "mejorable";
    }

    return `
        <div class="alert alert-info">
            <h4>Análisis Antropométrico Integral</h4>
            <p><strong>Fortalezas identificadas:</strong></p>
            <ul>${fortalezas.length > 0 ? fortalezas.map(f => `<li>${f}</li>`).join('') : '<li>Oportunidades de mejora en múltiples áreas</li>'}</ul>
            
            <p><strong>Áreas de mejora:</strong></p>
            <ul>${debilidades.length > 0 ? debilidades.map(d => `<li>${d}</li>`).join('') : '<li>Proporciones generalmente equilibradas</li>'}</ul>
            
            <p><strong>Simetría corporal:</strong> ${simetria}</p>
        </div>
        
        <div class="alert alert-success">
            <h4>Plan de Optimización Antropométrica</h4>
            <p><strong>Recomendaciones específicas:</strong></p>
            <ul>${recomendaciones.length > 0 ? recomendaciones.map(r => `<li>${r}</li>`).join('') : '<li>Mantener entrenamiento equilibrado actual</li>'}</ul>
            
            <p><strong>Seguimiento antropométrico:</strong> Evaluación cada 8-12 semanas para monitorear cambios en proporciones y ajustar enfoque de entrenamiento.</p>
            
            <p><strong>Objetivo a 12 meses:</strong> Optimizar ratios hacia rangos ideales mediante entrenamiento específico y periodización avanzada.</p>
        </div>
    `;
}

function mostrarPlanNutricional(analysis) {
    const container = document.getElementById('nutritionResults');
    
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-icon">🥗</div>
                <h2 class="card-title">Plan Nutricional Personalizado</h2>
            </div>
            
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-label">Calorías Objetivo</div>
                    <div class="metric-value">${Math.round(analysis.caloriasObjetivo)}</div>
                    <div class="metric-unit">kcal/día</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Proteínas</div>
                    <div class="metric-value">${analysis.proteinas}</div>
                    <div class="metric-unit">g (${Math.round((analysis.proteinas * 4 / analysis.caloriasObjetivo) * 100)}%)</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Carbohidratos</div>
                    <div class="metric-value">${analysis.carbohidratos}</div>
                    <div class="metric-unit">g (${Math.round((analysis.carbohidratos * 4 / analysis.caloriasObjetivo) * 100)}%)</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Grasas</div>
                    <div class="metric-value">${analysis.grasas}</div>
                    <div class="metric-unit">g (${Math.round((analysis.grasas * 9 / analysis.caloriasObjetivo) * 100)}%)</div>
                </div>
            </div>
            
            <div class="advanced-analysis">
                <h3>Recomendaciones Específicas</h3>
                <div class="analysis-grid">
                    ${generarRecomendacionesNutricionales(analysis)}
                </div>
            </div>
        </div>
    `;
}

function generarRecomendacionesNutricionales(analysis) {
    let recomendaciones = '';
    
    switch(analysis.objetivo) {
        case 'hipertrofia':
            recomendaciones += `
                <div class="analysis-item">
                    <h4>Fase de Hipertrofia</h4>
                    <div class="alert alert-success">
                        <strong>Estrategia:</strong> Superávit calórico moderado<br>
                        • Consume ${Math.round(analysis.caloriasObjetivo)} kcal diarias<br>
                        • Timing: carbohidratos pre/post entreno<br>
                        • Hidratación: 35-40ml/kg peso corporal<br>
                        • Frecuencia: 5-6 comidas diarias
                    </div>
                </div>
            `;
            break;
        case 'definicion':
            recomendaciones += `
                <div class="analysis-item">
                    <h4>Fase de Definición</h4>
                    <div class="alert alert-warning">
                        <strong>Estrategia:</strong> Déficit calórico controlado<br>
                        • Consume ${Math.round(analysis.caloriasObjetivo)} kcal diarias<br>
                        • Proteína alta para preservar masa muscular<br>
                        • Carbohidratos: timing estratégico<br>
                        • Refeed day cada 10-14 días
                    </div>
                </div>
            `;
            break;
        case 'recomposicion':
            recomendaciones += `
                <div class="analysis-item">
                    <h4>Recomposición Corporal</h4>
                    <div class="alert alert-info">
                        <strong>Estrategia:</strong> Balance energético neutro<br>
                        • Ciclado de carbohidratos<br>
                        • Proteína alta constante<br>
                        • Timing nutricional preciso<br>
                        • Monitoreo semanal
                    </div>
                </div>
            `;
            break;
    }
    
    recomendaciones += `
        <div class="analysis-item">
            <h4>Suplementación Recomendada</h4>
            ${generarSuplementacion(analysis)}
        </div>
    `;
    
    return recomendaciones;
}

function generarSuplementacion(analysis) {
    let suplementos = '';
    
    if (analysis.objetivo === 'hipertrofia' || analysis.objetivo === 'fuerza') {
        suplementos = `
            <div class="alert alert-info">
                <strong>Básicos:</strong><br>
                • Proteína whey: 25-30g post-entreno<br>
                • Creatina monohidrato: 5g diarios<br>
                • Multivitamínico: 1 dosis diaria<br>
                <strong>Opcionales:</strong><br>
                • Beta-alanina: 3-5g pre-entreno<br>
                • HMB: 3g en 3 tomas con comidas
            </div>
        `;
    } else if (analysis.objetivo === 'definicion') {
        suplementos = `
            <div class="alert alert-info">
                <strong>Básicos:</strong><br>
                • Proteína caseína: antes de dormir<br>
                • L-Carnitina: 2-3g pre-entreno<br>
                • Omega-3: 1-2g diarios<br>
                <strong>Opcionales:</strong><br>
                • Extracto té verde: con comidas<br>
                • CLA: 3-6g diarios
            </div>
        `;
    } else {
        suplementos = `
            <div class="alert alert-info">
                <strong>Básicos universales:</strong><br>
                • Proteína en polvo: según necesidades<br>
                • Multivitamínico: cobertura nutricional<br>
                • Omega-3: salud cardiovascular<br>
                • Vitamina D3: 2000-4000 UI diarias
            </div>
        `;
    }
    
    return suplementos;
}

function mostrarProgramaEntrenamiento(analysis) {
    const container = document.getElementById('trainingResults');
    
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-icon">💪</div>
                <h2 class="card-title">Programa de Entrenamiento</h2>
            </div>
            
            <div class="advanced-analysis">
                <h3>Programa Personalizado - Objetivo: ${analysis.objetivo.toUpperCase()}</h3>
                <div class="analysis-grid">
                    ${generarProgramaEntrenamiento(analysis)}
                </div>
            </div>
        </div>
    `;
}

function generarProgramaEntrenamiento(analysis) {
    let programa = '';
    
    const desequilibrios = [];
    if (analysis.proporciones.relacionTrenSuperior > 1.4) {
        desequilibrios.push('Priorizar tren inferior');
    }
    if (analysis.ffmi < 18) {
        desequilibrios.push('Enfoque en masa muscular general');
    }
    if (analysis.proporciones.hombroCintura < 1.4) {
        desequilibrios.push('Desarrollo de hombros');
    }
    
    switch(analysis.objetivo) {
        case 'hipertrofia':
            programa = `
                <div class="analysis-item">
                    <h4>Rutina Hipertrofia - ${analysis.experiencia}</h4>
                    <div class="alert alert-success">
                        <strong>Estructura:</strong> Push/Pull/Legs (2x semana)<br>
                        • Frecuencia: 6 días/semana<br>
                        • Series por grupo: 16-20 semanales<br>
                        • Rango rep: 6-12 (hipertrofia)<br>
                        • Descanso: 60-120 segundos<br>
                        <strong>Prioridades:</strong> ${desequilibrios.join(', ') || 'Desarrollo equilibrado'}
                    </div>
                </div>
                
                <div class="analysis-item">
                    <h4>División Semanal</h4>
                    <div class="alert alert-info">
                        <strong>Lunes:</strong> Push (Pecho, Hombros, Tríceps)<br>
                        <strong>Martes:</strong> Pull (Espalda, Bíceps)<br>
                        <strong>Miércoles:</strong> Legs (Cuádriceps, Glúteos, Pantorrillas)<br>
                        <strong>Jueves:</strong> Push<br>
                        <strong>Viernes:</strong> Pull<br>
                        <strong>Sábado:</strong> Legs + Core<br>
                        <strong>Domingo:</strong> Descanso activo
                    </div>
                </div>
            `;
            break;
            
        case 'definicion':
            programa = `
                <div class="analysis-item">
                    <h4>Rutina Definición</h4>
                    <div class="alert alert-warning">
                        <strong>Estructura:</strong> Upper/Lower + Cardio<br>
                        • Frecuencia: 5-6 días/semana<br>
                        • Pesas: 4 días, Cardio: 3-4 días<br>
                        • Series por grupo: 12-16 semanales<br>
                        • Rango rep: 8-15 + HIIT<br>
                        • Cardio: 20-30 min post-entreno
                    </div>
                </div>
            `;
            break;
            
        case 'fuerza':
            programa = `
                <div class="analysis-item">
                    <h4>Rutina Fuerza</h4>
                    <div class="alert alert-info">
                        <strong>Estructura:</strong> Powerlifting adaptado<br>
                        • Frecuencia: 4-5 días/semana<br>
                        • Enfoque: Squat, Bench, Deadlift<br>
                        • Rango rep: 1-6 (fuerza), 6-10 (asistencias)<br>
                        • Descanso: 3-5 minutos ejercicios principales
                    </div>
                </div>
            `;
            break;
            
        case 'recomposicion':
            programa = `
                <div class="analysis-item">
                    <h4>Rutina Recomposición</h4>
                    <div class="alert alert-info">
                        <strong>Estructura:</strong> Full Body + Especialización<br>
                        • Frecuencia: 4-5 días/semana<br>
                        • Combinación fuerza + hipertrofia<br>
                        • Periodización ondulante<br>
                        • Enfoque en debilidades identificadas
                    </div>
                </div>
            `;
            break;
    }
    
    return programa;
}

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${tipo}`;
    notification.textContent = mensaje;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Funciones para guardar evaluación y progreso
function guardarEvaluacion() {
    if (Object.keys(currentAnalysis).length === 0) {
        mostrarNotificacion('Complete primero el análisis corporal', 'warning');
        return;
    }
    
    const evaluacion = {
        ...currentAnalysis,
        timestamp: new Date().getTime(),
        id: Date.now()
    };
    
    evaluationHistory.push(evaluacion);
    mostrarNotificacion('Evaluación guardada correctamente', 'success');
    mostrarProgreso();
}

function mostrarProgreso() {
    const container = document.getElementById('progressContent');
    
    if (evaluationHistory.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                No hay evaluaciones guardadas. Guarde su primera evaluación para comenzar el seguimiento.
            </div>
        `;
        return;
    }
    
    if (evaluationHistory.length === 1) {
        const objetivos = generarMetricasObjetivo(evaluationHistory[0]);
        container.innerHTML = `
            <div class="alert alert-info">
                Se requieren al menos 2 evaluaciones para mostrar el progreso.
                <br><strong>Evaluaciones guardadas:</strong> ${evaluationHistory.length}
            </div>
            <div class="card" style="margin-top: 20px;">
                <div class="card-header">
                    <div class="card-icon">🎯</div>
                    <h3 class="card-title">Métricas Objetivo (12 meses)</h3>
                </div>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-label">Peso Objetivo</div>
                        <div class="metric-value">${objetivos.peso.toFixed(1)}</div>
                        <div class="metric-unit">kg</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Masa Magra Objetivo</div>
                        <div class="metric-value">${objetivos.masaMagra.toFixed(1)}</div>
                        <div class="metric-unit">kg</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Grasa Objetivo</div>
                        <div class="metric-value">${objetivos.grasa.toFixed(1)}</div>
                        <div class="metric-unit">%</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">FFMI Objetivo</div>
                        <div class="metric-value">${objetivos.ffmi.toFixed(1)}</div>
                        <div class="metric-unit">kg/m²</div>
                    </div>
                </div>
            </div>
        `;
        return;
    }
    
    // Lógica para mostrar progreso cuando hay múltiples evaluaciones
    const sorted = [...evaluationHistory].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    const primera = sorted[0];
    const ultima = sorted[sorted.length - 1];
    const objetivos = generarMetricasObjetivo(ultima);
    
    const cambios = calcularCambios(primera, ultima);
    
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-icon">📊</div>
                <h3 class="card-title">Evolución: ${primera.fecha} → ${ultima.fecha}</h3>
            </div>
            
            <div class="metrics-grid">
                ${Object.keys(cambios).map(key => `
                    <div class="metric-card">
                        <div class="metric-label">${cambios[key].nombre}</div>
                        <div class="metric-value" style="color: ${cambios[key].cambio > 0 ? '#10b981' : cambios[key].cambio < 0 ? '#ef4444' : '#6b7280'}">
                            ${cambios[key].cambio > 0 ? '+' : ''}${cambios[key].cambio.toFixed(1)}
                        </div>
                        <div class="metric-unit">${cambios[key].unidad} (${cambios[key].porcentaje.toFixed(1)}%)</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="card" style="margin-top: 30px;">
            <div class="card-header">
                <div class="card-icon">🎯</div>
                <h3 class="card-title">Comparación: Actual vs Objetivo</h3>
            </div>
            <div class="comparison-table">
                <div class="comparison-header">Métrica</div>
                <div class="comparison-header">Actual</div>
                <div class="comparison-header">Objetivo</div>
                <div class="comparison-header">Diferencia</div>
                
                <div class="comparison-cell">Peso</div>
                <div class="comparison-cell">${ultima.peso} kg</div>
                <div class="comparison-cell">${objetivos.peso.toFixed(1)} kg</div>
                <div class="comparison-cell ${objetivos.peso > ultima.peso ? 'good' : 'below'}">
                    ${(objetivos.peso - ultima.peso).toFixed(1)} kg
                </div>
                
                <div class="comparison-cell">Masa Magra</div>
                <div class="comparison-cell">${ultima.masaMagraKg?.toFixed(1) || '-'} kg</div>
                <div class="comparison-cell">${objetivos.masaMagra.toFixed(1)} kg</div>
                <div class="comparison-cell ${objetivos.masaMagra > (ultima.masaMagraKg || 0) ? 'excellent' : 'average'}">
                    ${(objetivos.masaMagra - (ultima.masaMagraKg || 0)).toFixed(1)} kg
                </div>
                
                <div class="comparison-cell">Grasa Corporal</div>
                <div class="comparison-cell">${ultima.porcentajeGrasa?.toFixed(1) || '-'}%</div>
                <div class="comparison-cell">${objetivos.grasa.toFixed(1)}%</div>
                <div class="comparison-cell ${objetivos.grasa < (ultima.porcentajeGrasa || 100) ? 'excellent' : 'average'}">
                    ${(objetivos.grasa - (ultima.porcentajeGrasa || 0)).toFixed(1)}%
                </div>
                
                <div class="comparison-cell">FFMI</div>
                <div class="comparison-cell">${ultima.ffmi?.toFixed(1) || '-'}</div>
                <div class="comparison-cell">${objetivos.ffmi.toFixed(1)}</div>
                <div class="comparison-cell ${objetivos.ffmi > (ultima.ffmi || 0) ? 'excellent' : 'average'}">
                    ${(objetivos.ffmi - (ultima.ffmi || 0)).toFixed(1)}
                </div>
            </div>
        </div>
    `;
}

function generarMetricasObjetivo(analysis) {
    const objetivos = {};
    
    switch(analysis.objetivo) {
        case 'hipertrofia':
            objetivos.peso = analysis.peso + 3;
            objetivos.masaMagra = analysis.masaMagraKg + 4;
            objetivos.grasa = Math.max(analysis.porcentajeGrasa - 2, 8);
            objetivos.ffmi = analysis.ffmi + 1.5;
            break;
        case 'definicion':
            objetivos.peso = analysis.peso - 5;
            objetivos.masaMagra = analysis.masaMagraKg - 1;
            objetivos.grasa = Math.max(analysis.porcentajeGrasa - 5, 6);
            objetivos.ffmi = analysis.ffmi + 0.5;
            break;
        case 'recomposicion':
            objetivos.peso = analysis.peso;
            objetivos.masaMagra = analysis.masaMagraKg + 2;
            objetivos.grasa = Math.max(analysis.porcentajeGrasa - 3, 8);
            objetivos.ffmi = analysis.ffmi + 1;
            break;
        default:
            objetivos.peso = analysis.peso + 1;
            objetivos.masaMagra = analysis.masaMagraKg + 2;
            objetivos.grasa = Math.max(analysis.porcentajeGrasa - 1, 10);
            objetivos.ffmi = analysis.ffmi + 0.8;
    }

    return objetivos;
}

function calcularCambios(primera, ultima) {
    const metricas = [
        { key: 'peso', nombre: 'Peso', unidad: 'kg' },
        { key: 'porcentajeGrasa', nombre: 'Grasa', unidad: '%' },
        { key: 'masaMagraKg', nombre: 'Masa Magra', unidad: 'kg' },
        { key: 'ffmi', nombre: 'FFMI', unidad: 'kg/m²' },
        { key: 'brazo', nombre: 'Brazo', unidad: 'cm' },
        { key: 'cintura', nombre: 'Cintura', unidad: 'cm' }
    ];
    
    const cambios = {};
    
    metricas.forEach(metrica => {
        const inicial = primera[metrica.key] || 0;
        const final = ultima[metrica.key] || 0;
        const cambio = final - inicial;
        const porcentaje = inicial > 0 ? (cambio / inicial) * 100 : 0;
        
        cambios[metrica.key] = {
            nombre: metrica.nombre,
            unidad: metrica.unidad,
            cambio: cambio,
            porcentaje: porcentaje
        };
    });
    
    return cambios;
}

function generarInformeCompletoPDF() {
    if (Object.keys(currentAnalysis).length === 0) {
        mostrarNotificacion('Complete el análisis corporal antes de generar el informe', 'warning');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    let yPos = 20;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const lineHeight = 6;
    
    function addTitle(text, size = 16, color = [30, 58, 138]) {
        doc.setFontSize(size);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(text, margin, yPos);
        yPos += size * 0.6 + 8;
    }
    
    function addText(text, size = 12, color = [31, 41, 55]) {
        doc.setFontSize(size);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(color[0], color[1], color[2]);
        
        const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
        lines.forEach(line => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }
            doc.text(line, margin, yPos);
            yPos += lineHeight;
        });
        yPos += 3;
    }
    
    function addSection(title, content, titleSize = 14) {
        addTitle(title, titleSize);
        addText(content);
        yPos += 8;
    }

    // PORTADA
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageWidth, 60, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('INFORME TÉCNICO PROFESIONAL', margin, 30);
    doc.setFontSize(16);
    doc.text('Evaluación Corporal Avanzada DEXA Pro', margin, 45);
    
    yPos = 80;
    doc.setTextColor(31, 41, 55);
    
    addTitle('DATOS DEL CLIENTE', 18);
    addText(`Cliente: ${currentAnalysis.nombre}`, 14);
    addText(`Fecha de evaluación: ${currentAnalysis.fecha}`, 12);
    addText(`Edad: ${currentAnalysis.edad} años | Sexo: ${currentAnalysis.sexo === 'M' ? 'Masculino' : 'Femenino'}`, 12);
    addText(`Objetivo principal: ${currentAnalysis.objetivo.toUpperCase()}`, 12);
    addText(`Experiencia: ${currentAnalysis.experiencia}`, 12);
    
    // RESUMEN EJECUTIVO
    const resumenEjecutivo = `
HALLAZGOS PRINCIPALES:
El análisis antropométrico revela un perfil ${currentAnalysis.evaluacion.ffmi.categoria.toLowerCase()} con FFMI de ${currentAnalysis.ffmi.toFixed(1)} kg/m² y composición corporal ${currentAnalysis.evaluacion.grasa.categoria.toLowerCase()} (${currentAnalysis.porcentajeGrasa.toFixed(1)}% de grasa corporal).

COMPOSICIÓN CORPORAL DETALLADA:
• Peso total: ${currentAnalysis.peso} kg
• Masa libre de grasa: ${currentAnalysis.masaMagraKg.toFixed(1)} kg
• Masa grasa: ${currentAnalysis.masaGrasaKg.toFixed(1)} kg (${currentAnalysis.porcentajeGrasa.toFixed(1)}%)

DISTRIBUCIÓN DE MASA MAGRA:
• Masa muscular esquelética: ${currentAnalysis.masaMuscularEsqueletica.toFixed(1)} kg (43%)
• Agua corporal total: ${currentAnalysis.aguaCorporal.toFixed(1)} kg (42%)
• Masa ósea: ${currentAnalysis.masaOsea.toFixed(1)} kg (12%)
• Órganos: ${currentAnalysis.organos.toFixed(1)} kg (3%)

EVALUACIÓN DE RIESGO:
• IMC: ${currentAnalysis.imc.toFixed(1)} kg/m² (${currentAnalysis.evaluacion.imc.categoria})
• ICC: ${currentAnalysis.icc.toFixed(2)} (${currentAnalysis.evaluacion.riesgoMetabolico.categoria})
    `;
    
    addSection('RESUMEN EJECUTIVO', resumenEjecutivo);
    
    // Nueva página para análisis detallado
    doc.addPage();
    yPos = 20;
    
    addTitle('ANÁLISIS ANTROPOMÉTRICO DETALLADO', 16);
    
    // Proporciones principales
    const proporcionesTexto = `
RATIOS ANTROPOMÉTRICOS CLAVE:
• ICC (Cintura/Cadera): ${currentAnalysis.proporciones.icc.toFixed(2)} (${currentAnalysis.evaluacion.proporciones.icc.categoria})
• WHR (Hombro/Cintura): ${currentAnalysis.proporciones.hombroCintura.toFixed(2)} (${currentAnalysis.evaluacion.proporciones.hombroCintura.categoria})
• Proporción Brazo/Pecho: ${currentAnalysis.proporciones.brazoPecho.toFixed(2)} (${currentAnalysis.evaluacion.proporciones.brazoPecho.categoria})
• Proporción Brazo/Cintura: ${currentAnalysis.proporciones.brazoCintura.toFixed(2)} (${currentAnalysis.evaluacion.proporciones.brazoCintura.categoria})
• Proporción Pierna/Cadera: ${currentAnalysis.proporciones.piernaCadera.toFixed(2)} (${currentAnalysis.evaluacion.proporciones.piernaCadera.categoria})
• Relación Brazo/Antebrazo: ${currentAnalysis.proporciones.brazoAntebrazo.toFixed(2)} (${currentAnalysis.evaluacion.proporciones.brazoAntebrazo.categoria})

ÍNDICES ESPECIALIZADOS:
• Índice de Masa Muscular: ${currentAnalysis.proporciones.indiceMasaMuscular.toFixed(2)}
• Índice de Definición: ${currentAnalysis.proporciones.indiceDefinicion.toFixed(2)}
• Relación Tren Superior: ${currentAnalysis.proporciones.relacionTrenSuperior.toFixed(2)}
    `;
    
    addSection('', proporcionesTexto);
    
    // CONCLUSIONES PROFESIONALES
    addTitle('CONCLUSIONES Y RECOMENDACIONES PROFESIONALES', 16);
    
    let conclusiones = `
EVALUACIÓN INTEGRAL:
El sujeto presenta una composición corporal caracterizada por ${currentAnalysis.porcentajeGrasa > 15 && currentAnalysis.sexo === 'M' ? 
'un porcentaje de grasa corporal moderadamente elevado que requiere optimización' : 
currentAnalysis.porcentajeGrasa > 20 && currentAnalysis.sexo === 'F' ? 
'un porcentaje de grasa corporal que puede optimizarse' : 
'una composición corporal favorable para los objetivos planteados'}.

El FFMI de ${currentAnalysis.ffmi.toFixed(1)} kg/m² indica ${currentAnalysis.ffmi < 18 ? 
'potencial significativo para desarrollo muscular' : currentAnalysis.ffmi > 22 ? 
'desarrollo muscular excepcional' : 'desarrollo muscular en rango promedio-bueno'}.

ANÁLISIS ANTROPOMÉTRICO:
Las proporciones corporales revelan ${currentAnalysis.proporciones.hombroCintura > 1.5 ? 
'una estructura favorable con buena relación hombro-cintura' : 
'oportunidades de mejora en la relación hombro-cintura'}. 

${currentAnalysis.proporciones.relacionTrenSuperior > 1.4 ? 
'Se observa un desequilibrio con predominio del tren superior, requiriendo mayor énfasis en el desarrollo de extremidades inferiores.' : 
currentAnalysis.proporciones.relacionTrenSuperior < 1.1 ? 
'El tren inferior está bien desarrollado, sugiriendo incrementar el volumen de entrenamiento del tren superior.' : 
'El balance entre tren superior e inferior es adecuado.'}

PRESCRIPCIÓN NUTRICIONAL:
• TMB calculado: ${currentAnalysis.tmb.toFixed(0)} kcal/día
• Requerimiento energético total: ${currentAnalysis.caloriasObjetivo.toFixed(0)} kcal/día
• Distribución de macronutrientes:
  - Proteínas: ${currentAnalysis.proteinas}g/día (${(currentAnalysis.proteinas/currentAnalysis.peso).toFixed(1)}g/kg peso)
  - Carbohidratos: ${currentAnalysis.carbohidratos}g/día
  - Grasas: ${currentAnalysis.grasas}g/día

RECOMENDACIONES ESPECÍFICAS:
${currentAnalysis.objetivo === 'hipertrofia' ? 
'1. Implementar fase de volumen con superávit calórico de +300 kcal/día\n2. Protocolo de entrenamiento de hipertrofia 5-6 días/semana\n3. Énfasis en progresión de cargas y volumen\n4. Suplementación: creatina monohidrato, proteína whey' :
currentAnalysis.objetivo === 'definicion' ? 
'1. Déficit calórico controlado de -500 kcal/día\n2. Mantenimiento de masa muscular mediante entrenamiento de resistencia\n3. Incorporación de ejercicio cardiovascular estratégico\n4. Monitoreo semanal de composición corporal' :
'1. Enfoque de recomposición corporal\n2. Balance energético neutro con periodización de macronutrientes\n3. Entrenamiento de fuerza progresivo\n4. Evaluación mensual para ajustes'}

SEGUIMIENTO Y MONITOREO:
• Reevaluación cada 4-6 semanas
• Control de peso corporal diario
• Fotografías de progreso semanales
• Ajustes del protocolo basados en respuesta individual

PROYECCIÓN A 12 MESES:
Basado en el perfil actual y adherencia óptima al protocolo, se proyecta:
• Optimización de composición corporal según objetivos específicos
• Mejora en ratios antropométricos priorizados
• Incremento del FFMI hacia rangos superiores
• Reducción del riesgo metabólico (si aplica)
    `;
    
    addSection('', conclusiones);
    
    // PIE DE PÁGINA
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - 30, 285);
        doc.text(`DEXA Pro - Análisis Corporal Avanzado | ${new Date().toLocaleDateString()}`, margin, 285);
        doc.text('Informe generado por sistema profesional de evaluación antropométrica', margin, 290);
    }
    
    // Guardar PDF
    const fileName = `Informe_Profesional_${currentAnalysis.nombre.replace(/\s+/g, '_')}_${currentAnalysis.fecha}.pdf`;
    doc.save(fileName);
    
    mostrarNotificacion('Informe PDF profesional generado exitosamente', 'success');
}

function exportarDatosCSV() {
    if (evaluationHistory.length === 0) {
        mostrarNotificacion('No hay datos para exportar', 'warning');
        return;
    }
    
    const headers = [
        'Fecha', 'Nombre', 'Edad', 'Sexo', 'Peso', 'Estatura', 'IMC', 
        'Grasa_%', 'Masa_Magra_kg', 'FFMI', 'ICC', 'TMB', 'Calorias_Objetivo',
        'Proteinas_g', 'Carbohidratos_g', 'Grasas_g', 'Hombros', 'Pecho', 
        'Cintura', 'Brazo', 'Muslo', 'Pantorrilla', 'Objetivo', 'Experiencia',
        'Hombro_Cintura', 'Brazo_Pecho', 'Brazo_Cintura', 'Pierna_Cadera',
        'Brazo_Antebrazo', 'Pecho_Cintura', 'Cuello_Cintura', 'Pierna_Cintura',
        'Indice_Masa_Muscular', 'Indice_Definicion', 'Relacion_Tren_Superior'
    ];
    
    let csv = headers.join(',') + '\n';
    
    evaluationHistory.forEach(eval => {
        const row = [
            eval.fecha, eval.nombre, eval.edad, eval.sexo, eval.peso, eval.estatura,
            eval.imc?.toFixed(1) || '', eval.porcentajeGrasa?.toFixed(1) || '',
            eval.masaMagraKg?.toFixed(1) || '', eval.ffmi?.toFixed(1) || '',
            eval.icc?.toFixed(2) || '', eval.tmb?.toFixed(0) || '',
            eval.caloriasObjetivo?.toFixed(0) || '', eval.proteinas || '',
            eval.carbohidratos || '', eval.grasas || '', eval.hombros || '',
            eval.pecho || '', eval.cintura || '', eval.brazo || '',
            eval.muslo || '', eval.pantorrilla || '', eval.objetivo || '',
            eval.experiencia || '',
            eval.proporciones?.hombroCintura?.toFixed(2) || '',
            eval.proporciones?.brazoPecho?.toFixed(2) || '',
            eval.proporciones?.brazoCintura?.toFixed(2) || '',
            eval.proporciones?.piernaCadera?.toFixed(2) || '',
            eval.proporciones?.brazoAntebrazo?.toFixed(2) || '',
            eval.proporciones?.pechoCintura?.toFixed(2) || '',
            eval.proporciones?.cuelloCintura?.toFixed(2) || '',
            eval.proporciones?.piernaCintura?.toFixed(2) || '',
            eval.proporciones?.indiceMasaMuscular?.toFixed(2) || '',
            eval.proporciones?.indiceDefinicion?.toFixed(2) || '',
            eval.proporciones?.relacionTrenSuperior?.toFixed(2) || ''
        ];
        csv += row.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `datos_corporales_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    mostrarNotificacion('Datos exportados a CSV correctamente', 'success');
}
// REEMPLAZAR la función recopilarAnalisisIA() con esta versión que incluye diagnóstico

function recopilarAnalisisIA() {
    console.log('=== DIAGNÓSTICO RECOPILACIÓN IA ===');
    
    const aiData = {
        hasAI: false,
        completo: '',
        proporciones: '',
        nutricion: '',
        progreso: ''
    };
    
    // Buscar de múltiples formas las tarjetas de IA
    console.log('Buscando tarjetas de IA...');
    
    // Método 1: Buscar por clase ai-analysis-card
    let aiCards = document.querySelectorAll('.ai-analysis-card');
    console.log('Método 1 - ai-analysis-card:', aiCards.length);
    
    // Método 2: Buscar por contenido que mencione IA
    if (aiCards.length === 0) {
        aiCards = document.querySelectorAll('.card');
        aiCards = Array.from(aiCards).filter(card => {
            const title = card.querySelector('.card-title')?.textContent || '';
            return title.includes('IA') || title.includes('Inteligencia') || title.includes('Llama');
        });
        console.log('Método 2 - filtrado por contenido IA:', aiCards.length);
    }
    
    // Método 3: Buscar en todos los contenedores de resultados
    if (aiCards.length === 0) {
        const containers = ['analysisResults', 'proportionsResults', 'nutritionResults', 'progressContent'];
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                const cards = container.querySelectorAll('.card');
                cards.forEach(card => {
                    const title = card.querySelector('.card-title, h3, h4')?.textContent || '';
                    const content = card.textContent || '';
                    if (content.includes('Llama') || content.includes('IA generado') || title.includes('IA')) {
                        aiCards = [...(aiCards || []), card];
                    }
                });
            }
        });
        console.log('Método 3 - búsqueda en contenedores:', aiCards.length);
    }
    
    // Procesar tarjetas encontradas
    if (aiCards.length > 0) {
        console.log('Procesando', aiCards.length, 'tarjetas encontradas...');
        
        Array.from(aiCards).forEach((card, index) => {
            const title = card.querySelector('.card-title, h3, h4')?.textContent || '';
            const contentElement = card.querySelector('.ai-response-content') || 
                                 card.querySelector('[class*="response"]') || 
                                 card;
            
            let content = contentElement?.textContent || '';
            
            console.log(`Tarjeta ${index + 1}:`, {
                titulo: title,
                tieneContenido: content.length > 0,
                longitudContenido: content.length
            });
            
            if (content && content.length > 50) { // Solo si hay contenido sustancial
                aiData.hasAI = true;
                
                // Limpiar contenido
                content = content
                    .replace(/Nota:.*?recomendada\.?/gi, '') // Remover disclaimers
                    .replace(/Este análisis.*?proporcionados\.?/gi, '')
                    .replace(/\s+/g, ' ')
                    .trim();
                
                // Clasificar por tipo
                if (title.toLowerCase().includes('completo') || title.toLowerCase().includes('integral')) {
                    aiData.completo = content;
                    console.log('Análisis completo encontrado');
                } else if (title.toLowerCase().includes('proporcion')) {
                    aiData.proporciones = content;
                    console.log('Análisis proporciones encontrado');
                } else if (title.toLowerCase().includes('nutric')) {
                    aiData.nutricion = content;
                    console.log('Análisis nutrición encontrado');
                } else if (title.toLowerCase().includes('progreso')) {
                    aiData.progreso = content;
                    console.log('Análisis progreso encontrado');
                } else {
                    // Si no podemos clasificar, lo ponemos como análisis completo
                    aiData.completo = content;
                    console.log('Análisis no clasificado, agregado como completo');
                }
            }
        });
    }
    
    console.log('Resultado final:', {
        tieneIA: aiData.hasAI,
        completo: aiData.completo.length > 0,
        proporciones: aiData.proporciones.length > 0,
        nutricion: aiData.nutricion.length > 0,
        progreso: aiData.progreso.length > 0
    });
    
    return aiData;
}

// NUEVA función para probar la recopilación de datos IA
function probarRecopilacionIA() {
    console.log('=== PRUEBA DE RECOPILACIÓN IA ===');
    const aiData = recopilarAnalisisIA();
    
    if (aiData.hasAI) {
        mostrarNotificacion(`IA encontrada: ${Object.values(aiData).filter(v => v && v.length > 0).length - 1} análisis`, 'success');
        
        // Mostrar preview del contenido
        console.log('PREVIEW DE CONTENIDO IA:');
        if (aiData.completo) console.log('Completo:', aiData.completo.substring(0, 100) + '...');
        if (aiData.proporciones) console.log('Proporciones:', aiData.proporciones.substring(0, 100) + '...');
        if (aiData.nutricion) console.log('Nutrición:', aiData.nutricion.substring(0, 100) + '...');
        if (aiData.progreso) console.log('Progreso:', aiData.progreso.substring(0, 100) + '...');
    } else {
        mostrarNotificacion('No se encontraron análisis de IA', 'warning');
        console.log('No hay análisis de IA disponibles para incluir en el PDF');
    }
    
    return aiData;
}

// AGREGAR estas funciones al final de script.js para integrar IA en el PDF

// Función para recopilar análisis de IA existentes
function recopilarAnalisisIA() {
    const aiData = {
        hasAI: false,
        completo: '',
        proporciones: '',
        nutricion: '',
        progreso: ''
    };
    
    // Buscar tarjetas de análisis IA en el DOM
    const aiCards = document.querySelectorAll('.ai-analysis-card');
    
    aiCards.forEach(card => {
        const title = card.querySelector('.card-title')?.textContent || '';
        const content = card.querySelector('.ai-response-content')?.textContent || '';
        
        if (content) {
            aiData.hasAI = true;
            
            // Limpiar contenido HTML
            const cleanContent = content
                .replace(/<[^>]*>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            
            if (title.includes('Completo')) {
                aiData.completo = cleanContent;
            } else if (title.includes('Proporciones')) {
                aiData.proporciones = cleanContent;
            } else if (title.includes('Nutricional')) {
                aiData.nutricion = cleanContent;
            } else if (title.includes('Progreso')) {
                aiData.progreso = cleanContent;
            }
        }
    });
    
    return aiData;
}

// Función mejorada para agregar secciones de IA al PDF con mejor estructura
function agregarSeccionesIAalPDF(doc, aiData, addTitle, addText, addSection) {
    if (!aiData.hasAI) return;
    
    // Función auxiliar para procesar y estructurar el contenido de IA
    function procesarContenidoIA(content) {
        if (!content) return [];
        
        let sections = [];
        
        // Detectar patrones específicos en el texto corrido
        const patterns = [
            { regex: /(\d+\.\s*[^.]+:)/, type: 'numbered_title' },
            { regex: /(Análisis\s+[^:]+:|Identificación\s+[^:]+:|Recomendaciones\s+[^:]+:|Sugerencias\s+[^:]+:|Protocolo\s+[^:]+:)/gi, type: 'main_title' },
            { regex: /(Fortalezas:|Áreas de mejora:|IMC|Grasa corporal|Masa magra|FFMI)/gi, type: 'subtitle' }
        ];
        
        // Dividir por patrones principales primero
        let remainingContent = content;
        let matches = [];
        
        // Buscar títulos principales
        const mainTitleRegex = /(Análisis\s+[^.]+\.|Identificación\s+[^.]+\.|Recomendaciones\s+[^.]+\.|Sugerencias\s+[^.]+\.|Protocolo\s+[^.]+\.)/gi;
        let match;
        
        while ((match = mainTitleRegex.exec(content)) !== null) {
            matches.push({
                title: match[1].replace(/\.$/, ''),
                index: match.index,
                endIndex: match.index + match[1].length
            });
        }
        
        // Si encontramos títulos principales, dividir por ellos
        if (matches.length > 0) {
            for (let i = 0; i < matches.length; i++) {
                let sectionContent = '';
                let startIndex = matches[i].endIndex;
                let endIndex = i < matches.length - 1 ? matches[i + 1].index : content.length;
                
                sectionContent = content.substring(startIndex, endIndex).trim();
                
                // Subdividir el contenido de cada sección
                const subsections = dividirEnSubsecciones(sectionContent);
                
                sections.push({
                    title: matches[i].title,
                    content: '',
                    subsections: subsections
                });
            }
        } else {
            // Fallback: dividir por números
            const numberedSections = content.split(/(?=\d+\.\s)/);
            
            numberedSections.forEach(section => {
                section = section.trim();
                if (section.length > 10) {
                    const titleMatch = section.match(/^(\d+\.\s*[^:]+:?)/);
                    if (titleMatch) {
                        const title = titleMatch[1].replace(':', '');
                        const content = section.substring(titleMatch[0].length).trim();
                        sections.push({
                            title: title,
                            content: content,
                            subsections: []
                        });
                    }
                }
            });
        }
        
        return sections;
    }
    
    // Función auxiliar para dividir contenido en subsecciones
    function dividirEnSubsecciones(content) {
        const subsections = [];
        
        // Buscar patrones como "1. Algo:", "Fortalezas:", etc.
        const subPatterns = [
            /(\d+\.\s*[^:]+:)/g,
            /(Fortalezas:|Áreas de mejora:)/g,
            /(IMC[^:]*:|Grasa corporal[^:]*:|Masa magra[^:]*:|FFMI[^:]*:)/g
        ];
        
        let matches = [];
        subPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                matches.push({
                    title: match[1].replace(':', ''),
                    index: match.index,
                    endIndex: match.index + match[1].length
                });
            }
        });
        
        // Ordenar por posición
        matches.sort((a, b) => a.index - b.index);
        
        // Extraer contenido de cada subsección
        for (let i = 0; i < matches.length; i++) {
            let startIndex = matches[i].endIndex;
            let endIndex = i < matches.length - 1 ? matches[i + 1].index : content.length;
            let sectionContent = content.substring(startIndex, endIndex).trim();
            
            if (sectionContent.length > 0) {
                subsections.push({
                    title: matches[i].title,
                    content: sectionContent
                });
            }
        }
        
        return subsections;
    }
    
    // Función auxiliar para agregar secciones IA con formato estructurado
    function addAISection(title, content) {
        if (!content) return;
        
        // Agregar nueva página para secciones IA importantes
        doc.addPage();
        let yPos = 20;
        const pageWidth = doc.internal.pageSize.width;
        const margin = 20;
        
        // Título principal con estilo IA
        doc.setFillColor(30, 58, 138);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(title, margin + 5, yPos + 10);
        yPos += 25;
        
        // Subtítulo indicando IA
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(10);
        doc.setFont(undefined, 'italic');
        doc.text('Análisis generado por IA (Llama 3.1-8B) - Revisión profesional recomendada', margin, yPos);
        yPos += 15;
        
        // Procesar y estructurar el contenido
        const sections = procesarContenidoIA(content);
        
        if (sections.length > 0) {
            // Mostrar contenido estructurado por secciones
            sections.forEach(section => {
                // Verificar espacio en la página
                if (yPos > 240) {
                    doc.addPage();
                    yPos = 20;
                }
                
                // Subtítulo de sección principal
                doc.setTextColor(30, 58, 138);
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                const titleLines = doc.splitTextToSize(section.title, pageWidth - 2 * margin - 10);
                titleLines.forEach(line => {
                    doc.text(line, margin, yPos);
                    yPos += 7;
                });
                yPos += 3;
                
                // Contenido principal de la sección
                if (section.content && section.content.length > 0) {
                    doc.setTextColor(31, 41, 55);
                    doc.setFont(undefined, 'normal');
                    doc.setFontSize(10);
                    
                    const contentLines = doc.splitTextToSize(section.content, pageWidth - 2 * margin - 10);
                    contentLines.forEach(line => {
                        if (yPos > 270) {
                            doc.addPage();
                            yPos = 20;
                        }
                        doc.text(line, margin, yPos);
                        yPos += 5;
                    });
                    yPos += 5;
                }
                
                // Mostrar subsecciones si existen
                if (section.subsections && section.subsections.length > 0) {
                    section.subsections.forEach(subsection => {
                        // Verificar espacio para subsección
                        if (yPos > 260) {
                            doc.addPage();
                            yPos = 20;
                        }
                        
                        // Título de subsección
                        doc.setTextColor(30, 58, 138);
                        doc.setFontSize(11);
                        doc.setFont(undefined, 'bold');
                        const subTitleLines = doc.splitTextToSize('• ' + subsection.title, pageWidth - 2 * margin - 20);
                        subTitleLines.forEach(line => {
                            doc.text(line, margin + 10, yPos);
                            yPos += 6;
                        });
                        yPos += 2;
                        
                        // Contenido de subsección
                        doc.setTextColor(31, 41, 55);
                        doc.setFont(undefined, 'normal');
                        doc.setFontSize(10);
                        
                        const subLines = doc.splitTextToSize(subsection.content, pageWidth - 2 * margin - 20);
                        subLines.forEach(line => {
                            if (yPos > 270) {
                                doc.addPage();
                                yPos = 20;
                            }
                            doc.text(line, margin + 15, yPos);
                            yPos += 5;
                        });
                        yPos += 5;
                    });
                }
                
                yPos += 5; // Espacio entre secciones principales
            });
        } else {
            // Fallback mejorado: dividir el texto en párrafos más legibles
            doc.setTextColor(31, 41, 55);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            
            // Dividir por oraciones largas y agregar espacios
            const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
            let currentParagraph = '';
            
            sentences.forEach((sentence, index) => {
                sentence = sentence.trim();
                
                // Detectar si es un título (contiene números al inicio o palabras clave)
                const isTitle = /^\d+\./.test(sentence) || 
                               /^(Análisis|Identificación|Recomendaciones|Sugerencias|Protocolo)/i.test(sentence);
                
                if (isTitle) {
                    // Escribir párrafo anterior si existe
                    if (currentParagraph.length > 0) {
                        const lines = doc.splitTextToSize(currentParagraph, pageWidth - 2 * margin);
                        lines.forEach(line => {
                            if (yPos > 270) {
                                doc.addPage();
                                yPos = 20;
                            }
                            doc.text(line, margin, yPos);
                            yPos += 5;
                        });
                        yPos += 8;
                        currentParagraph = '';
                    }
                    
                    // Escribir título
                    if (yPos > 260) {
                        doc.addPage();
                        yPos = 20;
                    }
                    
                    doc.setTextColor(30, 58, 138);
                    doc.setFont(undefined, 'bold');
                    doc.setFontSize(11);
                    const titleLines = doc.splitTextToSize(sentence, pageWidth - 2 * margin);
                    titleLines.forEach(line => {
                        doc.text(line, margin, yPos);
                        yPos += 6;
                    });
                    yPos += 5;
                    
                    doc.setTextColor(31, 41, 55);
                    doc.setFont(undefined, 'normal');
                    doc.setFontSize(10);
                } else {
                    // Acumular en párrafo
                    currentParagraph += sentence + ' ';
                    
                    // Si el párrafo es muy largo, escribirlo
                    if (currentParagraph.length > 400 || index === sentences.length - 1) {
                        const lines = doc.splitTextToSize(currentParagraph.trim(), pageWidth - 2 * margin);
                        lines.forEach(line => {
                            if (yPos > 270) {
                                doc.addPage();
                                yPos = 20;
                            }
                            doc.text(line, margin, yPos);
                            yPos += 5;
                        });
                        yPos += 8;
                        currentParagraph = '';
                    }
                }
            });
        }
        
        // Línea separadora al final
        yPos += 10;
        if (yPos < 270) {
            doc.setDrawColor(30, 58, 138);
            doc.setLineWidth(0.5);
            doc.line(margin, yPos, pageWidth - margin, yPos);
        }
    }
    
    // Agregar secciones según disponibilidad
    if (aiData.completo) {
        addAISection('ANÁLISIS INTEGRAL CON INTELIGENCIA ARTIFICIAL', aiData.completo);
    }
    
    if (aiData.proporciones) {
        addAISection('ANÁLISIS ANTROPOMÉTRICO AVANZADO CON IA', aiData.proporciones);
    }
    
    if (aiData.nutricion) {
        addAISection('PLAN NUTRICIONAL OPTIMIZADO CON IA', aiData.nutricion);
    }
    
    if (aiData.progreso) {
        addAISection('ANÁLISIS DE PROGRESO CON IA', aiData.progreso);
    }
}

// Función mejorada para generar PDF que incluye IA
function generarInformePDFconIA() {
    if (Object.keys(currentAnalysis).length === 0) {
        mostrarNotificacion('Complete el análisis corporal antes de generar el informe', 'warning');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    let yPos = 20;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const lineHeight = 6;
    
    // Recopilar análisis de IA
    const aiData = recopilarAnalisisIA();
    
    function addTitle(text, size = 16, color = [30, 58, 138]) {
        doc.setFontSize(size);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(text, margin, yPos);
        yPos += size * 0.6 + 8;
    }
    
    function addText(text, size = 12, color = [31, 41, 55]) {
        doc.setFontSize(size);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(color[0], color[1], color[2]);
        
        const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
        lines.forEach(line => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }
            doc.text(line, margin, yPos);
            yPos += lineHeight;
        });
        yPos += 3;
    }
    
    function addSection(title, content, titleSize = 14) {
        addTitle(title, titleSize);
        addText(content);
        yPos += 8;
    }

    // === PORTADA ===
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageWidth, 60, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('INFORME TÉCNICO PROFESIONAL', margin, 30);
    doc.setFontSize(16);
    doc.text('Evaluación Corporal Avanzada DEXA Pro', margin, 45);
    
    if (aiData.hasAI) {
        doc.setFontSize(12);
        doc.text('+ Análisis con Inteligencia Artificial', margin, 55);
    }
    
    yPos = 80;
    doc.setTextColor(31, 41, 55);
    
    // === DATOS DEL CLIENTE ===
    addTitle('DATOS DEL CLIENTE', 18);
    addText(`Cliente: ${currentAnalysis.nombre}`, 14);
    addText(`Fecha de evaluación: ${currentAnalysis.fecha}`, 12);
    addText(`Edad: ${currentAnalysis.edad} años | Sexo: ${currentAnalysis.sexo === 'M' ? 'Masculino' : 'Femenino'}`, 12);
    addText(`Objetivo principal: ${currentAnalysis.objetivo.toUpperCase()}`, 12);
    addText(`Experiencia: ${currentAnalysis.experiencia}`, 12);
    
    // === RESUMEN EJECUTIVO ===
    const resumenEjecutivo = `
HALLAZGOS PRINCIPALES:
El análisis antropométrico revela un perfil ${currentAnalysis.evaluacion.ffmi.categoria.toLowerCase()} con FFMI de ${currentAnalysis.ffmi.toFixed(1)} kg/m² y composición corporal ${currentAnalysis.evaluacion.grasa.categoria.toLowerCase()} (${currentAnalysis.porcentajeGrasa.toFixed(1)}% de grasa corporal).

COMPOSICIÓN CORPORAL DETALLADA:
• Peso total: ${currentAnalysis.peso} kg
• Masa libre de grasa: ${currentAnalysis.masaMagraKg.toFixed(1)} kg
• Masa grasa: ${currentAnalysis.masaGrasaKg.toFixed(1)} kg (${currentAnalysis.porcentajeGrasa.toFixed(1)}%)

DISTRIBUCIÓN DE MASA MAGRA:
• Masa muscular esquelética: ${currentAnalysis.masaMuscularEsqueletica.toFixed(1)} kg (43%)
• Agua corporal total: ${currentAnalysis.aguaCorporal.toFixed(1)} kg (42%)
• Masa ósea: ${currentAnalysis.masaOsea.toFixed(1)} kg (12%)
• Órganos: ${currentAnalysis.organos.toFixed(1)} kg (3%)

EVALUACIÓN DE RIESGO:
• IMC: ${currentAnalysis.imc.toFixed(1)} kg/m² (${currentAnalysis.evaluacion.imc.categoria})
• ICC: ${currentAnalysis.icc.toFixed(2)} (${currentAnalysis.evaluacion.riesgoMetabolico.categoria})

${aiData.hasAI ? 'NOTA: Este informe incluye análisis avanzado generado por IA para recomendaciones personalizadas.' : ''}
    `;
    
    addSection('RESUMEN EJECUTIVO', resumenEjecutivo);
    
    // === ANÁLISIS ANTROPOMÉTRICO ===
    doc.addPage();
    yPos = 20;
    
    addTitle('ANÁLISIS ANTROPOMÉTRICO DETALLADO', 16);
    
    const proporcionesTexto = `
RATIOS ANTROPOMÉTRICOS CLAVE:
• ICC (Cintura/Cadera): ${currentAnalysis.proporciones.icc.toFixed(2)} (${currentAnalysis.evaluacion.proporciones.icc.categoria})
• WHR (Hombro/Cintura): ${currentAnalysis.proporciones.hombroCintura.toFixed(2)} (${currentAnalysis.evaluacion.proporciones.hombroCintura.categoria})
• Proporción Brazo/Pecho: ${currentAnalysis.proporciones.brazoPecho.toFixed(2)} (${currentAnalysis.evaluacion.proporciones.brazoPecho.categoria})
• Proporción Brazo/Cintura: ${currentAnalysis.proporciones.brazoCintura.toFixed(2)} (${currentAnalysis.evaluacion.proporciones.brazoCintura.categoria})
• Proporción Pierna/Cadera: ${currentAnalysis.proporciones.piernaCadera.toFixed(2)} (${currentAnalysis.evaluacion.proporciones.piernaCadera.categoria})
• Relación Brazo/Antebrazo: ${currentAnalysis.proporciones.brazoAntebrazo.toFixed(2)} (${currentAnalysis.evaluacion.proporciones.brazoAntebrazo.categoria})

ÍNDICES ESPECIALIZADOS:
• Índice de Masa Muscular: ${currentAnalysis.proporciones.indiceMasaMuscular.toFixed(2)}
• Índice de Definición: ${currentAnalysis.proporciones.indiceDefinicion.toFixed(2)}
• Relación Tren Superior: ${currentAnalysis.proporciones.relacionTrenSuperior.toFixed(2)}
    `;
    
    addSection('', proporcionesTexto);
    
    // === PLAN NUTRICIONAL ===
    const planNutricional = `
REQUERIMIENTOS ENERGÉTICOS:
• TMB: ${currentAnalysis.tmb.toFixed(0)} kcal/día
• Gasto total: ${currentAnalysis.caloriaMantenimiento.toFixed(0)} kcal/día
• Calorías objetivo: ${currentAnalysis.caloriasObjetivo.toFixed(0)} kcal/día

DISTRIBUCIÓN DE MACRONUTRIENTES:
• Proteínas: ${currentAnalysis.proteinas}g/día (${(currentAnalysis.proteinas / currentAnalysis.peso).toFixed(1)}g/kg peso)
• Carbohidratos: ${currentAnalysis.carbohidratos}g/día
• Grasas: ${currentAnalysis.grasas}g/día
    `;
    
    addSection('PRESCRIPCIÓN NUTRICIONAL', planNutricional);
    
    // === AGREGAR SECCIONES DE IA ===
    agregarSeccionesIAalPDF(doc, aiData, addTitle, addText, addSection);
    
    // === CONCLUSIONES FINALES INTEGRADAS ===
    doc.addPage();
    yPos = 20;
    
    addTitle('CONCLUSIONES PROFESIONALES INTEGRADAS', 16);
    
    let conclusionesFinales = `
EVALUACIÓN TÉCNICA:
El análisis revela ${currentAnalysis.evaluacion.ffmi.categoria.toLowerCase()} desarrollo muscular y composición corporal ${currentAnalysis.evaluacion.grasa.categoria.toLowerCase()}. Las proporciones antropométricas indican ${currentAnalysis.proporciones.relacionTrenSuperior > 1.4 ? 'desequilibrio hacia tren superior' : 'desarrollo equilibrado'}.

RECOMENDACIONES PRINCIPALES:
• Objetivo nutricional: ${currentAnalysis.caloriasObjetivo.toFixed(0)} kcal/día
• Enfoque de entrenamiento: ${currentAnalysis.objetivo}
• Seguimiento: Evaluación cada 4-6 semanas
• Monitoreo: Composición corporal y progreso antropométrico

${aiData.hasAI ? `
SÍNTESIS CON INTELIGENCIA ARTIFICIAL:
El análisis complementario con IA proporciona recomendaciones personalizadas basadas en los datos antropométricos específicos del cliente. Las conclusiones de IA se integran con el análisis técnico tradicional para optimizar el protocolo de entrenamiento y nutrición.

NOTA IMPORTANTE:
Las recomendaciones generadas por IA han sido incluidas como complemento al análisis técnico tradicional. Todas las sugerencias deben ser evaluadas y validadas por profesionales calificados antes de su implementación.` : ''}

PROYECCIÓN A 12 MESES:
• Optimización de composición corporal según objetivos
• Mejora en ratios antropométricos identificados
• Incremento del FFMI hacia rangos superiores
• Reducción del riesgo metabólico si aplica
    `;
    
    addSection('', conclusionesFinales);
    
    // === PIE DE PÁGINA ===
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - 30, 285);
        doc.text(`DEXA Pro ${aiData.hasAI ? '+ IA' : ''} | ${new Date().toLocaleDateString()}`, margin, 285);
        doc.text('Informe generado por sistema profesional de evaluación antropométrica', margin, 290);
    }
    
    // Guardar PDF
    const fileName = `Informe_Completo_${aiData.hasAI ? 'IA_' : ''}${currentAnalysis.nombre.replace(/\s+/g, '_')}_${currentAnalysis.fecha}.pdf`;
    doc.save(fileName);
    
    const mensaje = aiData.hasAI ? 
        'Informe PDF con análisis de IA generado exitosamente' : 
        'Informe PDF generado exitosamente';
    mostrarNotificacion(mensaje, 'success');
}

// Función para agregar botón de PDF mejorado al sistema
function agregarBotonPDFconIA() {
    const reportsContainer = document.querySelector('#reports .form-grid');
    if (reportsContainer && !document.getElementById('pdfConIABtn')) {
        const nuevaOpcion = document.createElement('div');
        nuevaOpcion.className = 'analysis-item';
        nuevaOpcion.innerHTML = `
            <h4>Informe PDF con IA</h4>
            <p>Reporte profesional que incluye automáticamente los análisis de IA disponibles.</p>
            <button id="pdfConIABtn" class="btn btn-warning btn-full" onclick="generarInformePDFconIA()">
                🤖📄 Generar PDF + IA
            </button>
        `;
        reportsContainer.appendChild(nuevaOpcion);
    }
}

// Inicializar el botón mejorado cuando cargue la página
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(agregarBotonPDFconIA, 3000);
});

// ============================================
// SISTEMA DE PERSISTENCIA DE DATOS
// ============================================

const STORAGE_KEYS = {
    CURRENT_ANALYSIS: 'dexaPro_currentAnalysis',
    EVALUATION_HISTORY: 'dexaPro_evaluationHistory',
    FORM_DATA: 'dexaPro_formData'
};

// Guardar datos automáticamente
function autoSaveData() {
    try {
        if (Object.keys(currentAnalysis).length > 0) {
            localStorage.setItem(STORAGE_KEYS.CURRENT_ANALYSIS, JSON.stringify(currentAnalysis));
        }
        
        if (evaluationHistory.length > 0) {
            localStorage.setItem(STORAGE_KEYS.EVALUATION_HISTORY, JSON.stringify(evaluationHistory));
        }
        
        // Guardar datos del formulario
        const formData = obtenerDatosFormulario();
        localStorage.setItem(STORAGE_KEYS.FORM_DATA, JSON.stringify(formData));
        
    } catch (error) {
        console.error('Error guardando datos:', error);
    }
}

// Obtener datos actuales del formulario
function obtenerDatosFormulario() {
    return {
        nombre: document.getElementById('nombre').value,
        edad: document.getElementById('edad').value,
        sexo: document.getElementById('sexo').value,
        fecha: document.getElementById('fecha').value,
        experiencia: document.getElementById('experiencia').value,
        objetivo: document.getElementById('objetivo').value,
        actividad: document.getElementById('actividad').value,
        peso: document.getElementById('peso').value,
        estatura: document.getElementById('estatura').value,
        cintura: document.getElementById('cintura').value,
        cadera: document.getElementById('cadera').value,
        cuello: document.getElementById('cuello').value,
        hombros: document.getElementById('hombros').value,
        pecho: document.getElementById('pecho').value,
        brazo: document.getElementById('brazo').value,
        antebrazo: document.getElementById('antebrazo').value,
        muslo: document.getElementById('muslo').value,
        pantorrilla: document.getElementById('pantorrilla').value,
        grasaEstimada: document.getElementById('grasaEstimada').value
    };
}

// Restaurar datos del formulario
function restaurarDatosFormulario(formData) {
    if (!formData) return;
    
    Object.keys(formData).forEach(key => {
        const element = document.getElementById(key);
        if (element && formData[key]) {
            element.value = formData[key];
        }
    });
}

// Cargar datos guardados al iniciar
function cargarDatosGuardados() {
    try {
        // Cargar análisis actual
        const savedAnalysis = localStorage.getItem(STORAGE_KEYS.CURRENT_ANALYSIS);
        if (savedAnalysis) {
            currentAnalysis = JSON.parse(savedAnalysis);
            
            // Mostrar análisis guardado
            if (Object.keys(currentAnalysis).length > 0) {
                mostrarAnalisisDetallado(currentAnalysis);
                mostrarAnalisisProporciones(currentAnalysis);
                mostrarPlanNutricional(currentAnalysis);
                mostrarProgramaEntrenamiento(currentAnalysis);
                mostrarNotificacion('Datos anteriores restaurados', 'success');
            }
        }
        
        // Cargar historial de evaluaciones
        const savedHistory = localStorage.getItem(STORAGE_KEYS.EVALUATION_HISTORY);
        if (savedHistory) {
            evaluationHistory = JSON.parse(savedHistory);
            if (evaluationHistory.length > 0) {
                mostrarProgreso();
            }
        }
        
        // Cargar datos del formulario
        const savedFormData = localStorage.getItem(STORAGE_KEYS.FORM_DATA);
        if (savedFormData) {
            restaurarDatosFormulario(JSON.parse(savedFormData));
        }
        
    } catch (error) {
        console.error('Error cargando datos guardados:', error);
        mostrarNotificacion('Error al cargar datos anteriores', 'warning');
    }
}

// Resetear toda la información
function resetearTodosLosDatos() {
    if (!confirm('¿Estás seguro de que deseas eliminar TODOS los datos guardados? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        // Limpiar localStorage
        localStorage.removeItem(STORAGE_KEYS.CURRENT_ANALYSIS);
        localStorage.removeItem(STORAGE_KEYS.EVALUATION_HISTORY);
        localStorage.removeItem(STORAGE_KEYS.FORM_DATA);
        
        // Limpiar variables globales
        currentAnalysis = {};
        evaluationHistory = [];
        
        // Limpiar formularios
        document.querySelectorAll('.form-input').forEach(input => {
            if (input.type === 'date') {
                input.valueAsDate = new Date();
            } else if (input.type === 'select-one') {
                input.selectedIndex = 0;
            } else {
                input.value = '';
            }
        });
        
        // Restaurar valores por defecto
        document.getElementById('edad').value = '26';
        document.getElementById('peso').value = '80';
        document.getElementById('estatura').value = '180';
        document.getElementById('cintura').value = '86';
        document.getElementById('cadera').value = '103';
        document.getElementById('cuello').value = '39';
        document.getElementById('hombros').value = '129';
        document.getElementById('pecho').value = '117';
        document.getElementById('brazo').value = '38.5';
        document.getElementById('antebrazo').value = '29';
        document.getElementById('muslo').value = '63';
        document.getElementById('pantorrilla').value = '37';
        
        // Limpiar contenedores de resultados
        document.getElementById('analysisResults').innerHTML = '<div class="alert alert-info">Complete las mediciones para ver el análisis detallado.</div>';
        document.getElementById('proportionsResults').innerHTML = '<div class="alert alert-info">Complete el análisis para ver las proporciones antropométricas.</div>';
        document.getElementById('nutritionResults').innerHTML = '<div class="alert alert-info">Complete el análisis para obtener el plan nutricional.</div>';
        document.getElementById('trainingResults').innerHTML = '<div class="alert alert-info">Complete el análisis para obtener el programa de entrenamiento.</div>';
        document.getElementById('progressContent').innerHTML = '<div class="alert alert-info">Realice múltiples evaluaciones para ver su progreso.</div>';
        
        // Volver a la primera pestaña
        showTab('input');
        
        mostrarNotificacion('Todos los datos han sido eliminados', 'success');
        
    } catch (error) {
        console.error('Error reseteando datos:', error);
        mostrarNotificacion('Error al resetear datos', 'error');
    }
}

// Modificar función de guardar evaluación para incluir auto-guardado
const guardarEvaluacionOriginal = guardarEvaluacion;
guardarEvaluacion = function() {
    guardarEvaluacionOriginal();
    autoSaveData();
};

// Modificar función de análisis completo para auto-guardar
const calcularAnalisisCompletoOriginal = calcularAnalisisCompleto;
calcularAnalisisCompleto = function() {
    calcularAnalisisCompletoOriginal();
    autoSaveData();
};

// Auto-guardar cada vez que cambia el formulario (con debounce)
let autoSaveTimeout;
document.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('change', () => {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(autoSaveData, 1000);
    });
});

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(cargarDatosGuardados, 500);
});

// Mostrar indicador de datos guardados
function actualizarIndicadorEstado() {
    const statusElement = document.getElementById('dataStatus');
    if (!statusElement) return;
    
    const hasData = localStorage.getItem(STORAGE_KEYS.CURRENT_ANALYSIS) || 
                    localStorage.getItem(STORAGE_KEYS.EVALUATION_HISTORY);
    
    if (hasData) {
        const historyCount = evaluationHistory.length;
        statusElement.innerHTML = `💾 ${historyCount} evaluación${historyCount !== 1 ? 'es' : ''} guardada${historyCount !== 1 ? 's' : ''}`;
        statusElement.style.color = '#10b981';
    } else {
        statusElement.innerHTML = '📝 Sin datos guardados';
        statusElement.style.color = '#6b7280';
    }
}

// Actualizar indicador después de cargar datos
setTimeout(actualizarIndicadorEstado, 1000);