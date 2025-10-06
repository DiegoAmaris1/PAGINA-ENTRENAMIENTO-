// ai-analysis.js - Módulo de Análisis con Inteligencia Artificial
// Integración con LM Studio (puerto 1234)

class AIAnalysisModule {
    constructor() {
        this.apiUrl = 'http://localhost:1234/v1/chat/completions';
        this.isConnected = false;
        this.model = 'lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF';
    }

    // Verificar conexión con LM Studio
    async checkConnection() {
        try {
            const response = await fetch('http://localhost:1234/v1/models', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            this.isConnected = response.ok;
            return this.isConnected;
        } catch (error) {
            console.error('Error conectando con LM Studio:', error);
            this.isConnected = false;
            return false;
        }
    }

    // Enviar prompt al modelo de IA
    async sendPrompt(messages, temperature = 0.7, maxTokens = 1500) {
        if (!this.isConnected) {
            const connected = await this.checkConnection();
            if (!connected) {
                throw new Error('No se puede conectar con LM Studio. Asegúrate de que esté ejecutándose en el puerto 1234.');
            }
        }

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages,
                    temperature: temperature,
                    max_tokens: maxTokens,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Error en comunicación con IA:', error);
            throw error;
        }
    }

    // Generar prompt para análisis corporal
    generateBodyAnalysisPrompt(analysisData) {
        const prompt = `
Eres un experto en ciencias del deporte, nutrición y composición corporal. Analiza los siguientes datos antropométricos y proporciona recomendaciones profesionales detalladas.

DATOS DEL CLIENTE:
- Nombre: ${analysisData.nombre}
- Edad: ${analysisData.edad} años
- Sexo: ${analysisData.sexo === 'M' ? 'Masculino' : 'Femenino'}
- Objetivo: ${analysisData.objetivo}
- Experiencia: ${analysisData.experiencia}

COMPOSICIÓN CORPORAL:
- Peso: ${analysisData.peso} kg
- Estatura: ${analysisData.estatura} cm
- IMC: ${analysisData.imc?.toFixed(1)} kg/m²
- Grasa corporal: ${analysisData.porcentajeGrasa?.toFixed(1)}%
- Masa magra: ${analysisData.masaMagraKg?.toFixed(1)} kg
- FFMI: ${analysisData.ffmi?.toFixed(1)} kg/m²
- TMB: ${analysisData.tmb?.toFixed(0)} kcal/día

DISTRIBUCIÓN DE MASA MAGRA:
- Masa muscular esquelética: ${analysisData.masaMuscularEsqueletica?.toFixed(1)} kg
- Agua corporal: ${analysisData.aguaCorporal?.toFixed(1)} kg
- Masa ósea: ${analysisData.masaOsea?.toFixed(1)} kg
- Órganos: ${analysisData.organos?.toFixed(1)} kg

PROPORCIONES ANTROPOMÉTRICAS:
- ICC (Cintura/Cadera): ${analysisData.proporciones?.icc?.toFixed(2)}
- Hombro/Cintura: ${analysisData.proporciones?.hombroCintura?.toFixed(2)}
- Brazo/Pecho: ${analysisData.proporciones?.brazoPecho?.toFixed(2)}
- Brazo/Cintura: ${analysisData.proporciones?.brazoCintura?.toFixed(2)}
- Pierna/Cadera: ${analysisData.proporciones?.piernaCadera?.toFixed(2)}
- Relación Tren Superior: ${analysisData.proporciones?.relacionTrenSuperior?.toFixed(2)}

NUTRICIÓN CALCULADA:
- Calorías objetivo: ${analysisData.caloriasObjetivo?.toFixed(0)} kcal/día
- Proteínas: ${analysisData.proteinas}g
- Carbohidratos: ${analysisData.carbohidratos}g
- Grasas: ${analysisData.grasas}g

Proporciona un análisis profesional que incluya:
1. Evaluación integral del estado físico actual
2. Identificación de fortalezas y áreas de mejora específicas
3. Recomendaciones de entrenamiento personalizadas
4. Sugerencias nutricionales avanzadas
5. Protocolo de seguimiento y ajustes
6. Predicciones realistas de progreso a 3, 6 y 12 meses
7. Consideraciones especiales según edad, sexo y experiencia

Responde de manera profesional, técnica pero comprensible, como si fueras un entrenador certificado con experiencia en análisis corporal.
`;
        return prompt;
    }

    // Generar prompt para análisis de proporciones específico
    generateProportionsAnalysisPrompt(analysisData) {
        const prompt = `
Como experto en antropometría deportiva, analiza las siguientes proporciones corporales y proporciona recomendaciones específicas de entrenamiento.

RATIOS ANTROPOMÉTRICOS DETALLADOS:
- ICC: ${analysisData.proporciones?.icc?.toFixed(2)} (ideal: 0.75-0.85)
- Hombro/Cintura: ${analysisData.proporciones?.hombroCintura?.toFixed(2)} (ideal: 1.45-1.60)
- Brazo/Pecho: ${analysisData.proporciones?.brazoPecho?.toFixed(2)} (ideal: 0.32-0.38)
- Brazo/Cintura: ${analysisData.proporciones?.brazoCintura?.toFixed(2)} (ideal: 0.42-0.48)
- Pierna/Cadera: ${analysisData.proporciones?.piernaCadera?.toFixed(2)} (ideal: 0.58-0.65)
- Brazo/Antebrazo: ${analysisData.proporciones?.brazoAntebrazo?.toFixed(2)} (ideal: 1.28-1.38)
- Pecho/Cintura: ${analysisData.proporciones?.pechoCintura?.toFixed(2)} (ideal: 1.25-1.35)
- Cuello/Cintura: ${analysisData.proporciones?.cuelloCintura?.toFixed(2)} (ideal: 0.42-0.48)
- Pierna/Cintura: ${analysisData.proporciones?.piernaCintura?.toFixed(2)} (ideal: 0.68-0.78)

MEDIDAS ACTUALES:
- Hombros: ${analysisData.hombros} cm
- Pecho: ${analysisData.pecho} cm  
- Cintura: ${analysisData.cintura} cm
- Brazo: ${analysisData.brazo} cm
- Muslo: ${analysisData.muslo} cm
- Pantorrilla: ${analysisData.pantorrilla} cm

Sexo: ${analysisData.sexo === 'M' ? 'Masculino' : 'Femenino'}
Objetivo: ${analysisData.objetivo}

Analiza cada ratio e identifica:
1. Desequilibrios específicos entre grupos musculares
2. Prioridades de entrenamiento basadas en las desproporciones
3. Ejercicios específicos para corregir desequilibrios
4. Frecuencia y volumen recomendado por grupo muscular
5. Tiempo estimado para lograr proporciones ideales
6. Estrategias de periodización para optimizar el desarrollo

Sé específico con nombres de ejercicios, series, repeticiones y progresiones.
`;
        return prompt;
    }

    // Generar prompt para análisis nutricional avanzado
    generateNutritionAnalysisPrompt(analysisData) {
        const prompt = `
Como nutricionista deportivo especializado, analiza el perfil metabólico y proporciona un plan nutricional avanzado.

PERFIL METABÓLICO:
- TMB: ${analysisData.tmb?.toFixed(0)} kcal/día
- Gasto total: ${analysisData.caloriaMantenimiento?.toFixed(0)} kcal/día
- Calorías objetivo: ${analysisData.caloriasObjetivo?.toFixed(0)} kcal/día
- Composición corporal: ${analysisData.porcentajeGrasa?.toFixed(1)}% grasa
- FFMI: ${analysisData.ffmi?.toFixed(1)} kg/m²

DISTRIBUCIÓN CALCULADA:
- Proteínas: ${analysisData.proteinas}g (${((analysisData.proteinas * 4 / analysisData.caloriasObjetivo) * 100).toFixed(1)}%)
- Carbohidratos: ${analysisData.carbohidratos}g (${((analysisData.carbohidratos * 4 / analysisData.caloriasObjetivo) * 100).toFixed(1)}%)
- Grasas: ${analysisData.grasas}g (${((analysisData.grasas * 9 / analysisData.caloriasObjetivo) * 100).toFixed(1)}%)

CONTEXTO:
- Sexo: ${analysisData.sexo === 'M' ? 'Masculino' : 'Femenino'}
- Edad: ${analysisData.edad} años
- Objetivo: ${analysisData.objetivo}
- Nivel actividad: ${analysisData.actividad}

Proporciona:
1. Evaluación de la distribución calórica actual
2. Timing específico de macronutrientes
3. Estrategias de ciclado de carbohidratos si aplica
4. Recomendaciones de alimentos específicos
5. Protocolo de hidratación detallado
6. Suplementación basada en evidencia
7. Ajustes según fase de entrenamiento
8. Monitoreo de biomarcadores recomendados

Incluye ejemplos de comidas y horarios específicos.
`;
        return prompt;
    }

    // ============================================
    // NUEVO: PROMPT PARA ENTRENAMIENTO
    // ============================================
    generateTrainingAnalysisPrompt(analysisData) {
        const prompt = `
Como especialista en entrenamiento de fuerza y acondicionamiento físico, diseña un programa de entrenamiento detallado y personalizado.

PERFIL DEL ATLETA:
- Sexo: ${analysisData.sexo === 'M' ? 'Masculino' : 'Femenino'}
- Edad: ${analysisData.edad} años
- Experiencia: ${analysisData.experiencia}
- Objetivo principal: ${analysisData.objetivo}
- Nivel de actividad: ${analysisData.actividad}

COMPOSICIÓN CORPORAL:
- Peso: ${analysisData.peso} kg
- FFMI: ${analysisData.ffmi?.toFixed(1)} kg/m²
- Grasa corporal: ${analysisData.porcentajeGrasa?.toFixed(1)}%
- Masa muscular: ${analysisData.masaMuscularEsqueletica?.toFixed(1)} kg

ANÁLISIS DE PROPORCIONES:
- Relación Tren Superior: ${analysisData.proporciones?.relacionTrenSuperior?.toFixed(2)}
- Hombro/Cintura: ${analysisData.proporciones?.hombroCintura?.toFixed(2)}
- Brazo/Pecho: ${analysisData.proporciones?.brazoPecho?.toFixed(2)}
- Pierna/Cadera: ${analysisData.proporciones?.piernaCadera?.toFixed(2)}

DESEQUILIBRIOS IDENTIFICADOS:
${analysisData.proporciones?.relacionTrenSuperior > 1.4 ? '⚠ Tren superior dominante - requiere más énfasis en piernas' : ''}
${analysisData.proporciones?.hombroCintura < 1.4 ? '⚠ Hombros estrechos - necesitan desarrollo prioritario' : ''}
${analysisData.proporciones?.brazoPecho < 0.30 ? '⚠ Brazos subdesarrollados relativos al pecho' : ''}

Diseña un programa de entrenamiento que incluya:

1. ESTRUCTURA SEMANAL ESPECÍFICA
   - División de entrenamiento óptima
   - Días de entrenamiento y descanso
   - Distribución de grupos musculares

2. EJERCICIOS ESPECÍFICOS POR DÍA
   - Ejercicios principales y accesorios
   - Series, repeticiones y tempo
   - Rangos de carga (% 1RM o RPE)
   - Descansos entre series

3. PERIODIZACIÓN
   - Fases del programa (4-12 semanas)
   - Progresión de volumen e intensidad
   - Deloads y recuperación

4. ENFOQUE EN DEBILIDADES
   - Ejercicios correctivos específicos
   - Volumen adicional para grupos rezagados
   - Técnicas avanzadas

5. TRABAJO COMPLEMENTARIO
   - Cardio recomendado
   - Movilidad y flexibilidad
   - Trabajo de core

6. MÉTRICAS DE PROGRESO
   - Qué medir semanalmente
   - Señales de sobreentrenamiento
   - Cuándo ajustar el programa

Sé EXTREMADAMENTE específico con nombres de ejercicios, series, repeticiones y progresiones.
`;
        return prompt;
    }
    
    // Análisis completo con IA
    async analyzeWithAI(analysisData, analysisType = 'complete') {
        const loadingElement = this.showLoadingIndicator(analysisType);
        
        try {
            let prompt;
            let messages;

            switch (analysisType) {
                case 'complete':
                    prompt = this.generateBodyAnalysisPrompt(analysisData);
                    break;
                case 'proportions':
                    prompt = this.generateProportionsAnalysisPrompt(analysisData);
                    break;
                case 'nutrition':
                    prompt = this.generateNutritionAnalysisPrompt(analysisData);
                    break;
                case 'training':  // ← AGREGAR AQUÍ
                    prompt = this.generateTrainingAnalysisPrompt(analysisData);
                    break;    
                default:
                    prompt = this.generateBodyAnalysisPrompt(analysisData);
            }

            messages = [
                {
                    role: "system",
                    content: "Eres un experto en ciencias del deporte, composición corporal y nutrición deportiva con más de 15 años de experiencia. Proporciona análisis técnicos pero comprensibles, basados en evidencia científica."
                },
                {
                    role: "user",
                    content: prompt
                }
            ];

            const aiResponse = await this.sendPrompt(messages, 0.7, 2000);
            
            this.hideLoadingIndicator(loadingElement);
            return aiResponse;

        } catch (error) {
            this.hideLoadingIndicator(loadingElement);
            console.error('Error en análisis con IA:', error);
            throw error;
        }
    }

    // Mostrar indicador de carga
    showLoadingIndicator(type) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'ai-loading-indicator';
        loadingDiv.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p>Analizando con IA (Llama 3.1)...</p>
                <small>Generando recomendaciones personalizadas</small>
            </div>
        `;
        
        document.body.appendChild(loadingDiv);
        return loadingDiv;
    }

    // Ocultar indicador de carga
    hideLoadingIndicator(loadingElement) {
        if (loadingElement && loadingElement.parentNode) {
            loadingElement.parentNode.removeChild(loadingElement);
        }
    }

    // Mostrar resultados del análisis con IA
    displayAIAnalysis(aiResponse, analysisType = 'complete') {
        let targetContainer;
        let cardTitle;
        let cardIcon;

        switch (analysisType) {
            case 'proportions':
                targetContainer = document.getElementById('proportionsResults');
                cardTitle = 'Análisis de Proporciones con IA';
                cardIcon = '🤖';
                break;
            case 'nutrition':
                targetContainer = document.getElementById('nutritionResults');
                cardTitle = 'Plan Nutricional con IA';
                cardIcon = '🧠';
                break;
            case 'training':  // ← AGREGAR AQUÍ
                targetContainer = document.getElementById('trainingResults');
                cardTitle = 'Programa de Entrenamiento con IA';
                cardIcon = '💪';
                break;
            default:
                targetContainer = document.getElementById('analysisResults');
                cardTitle = 'Análisis Completo con IA';
                cardIcon = '🤖';
        }

        const aiAnalysisCard = document.createElement('div');
        aiAnalysisCard.className = 'card ai-analysis-card';
        aiAnalysisCard.innerHTML = `
            <div class="card-header">
                <div class="card-icon">${cardIcon}</div>
                <h3 class="card-title">${cardTitle}</h3>
                <div class="ai-badge">
                    <span>Llama 3.1-8B</span>
                </div>
            </div>
            <div class="ai-response-content">
                ${this.formatAIResponse(aiResponse)}
            </div>
            <div class="ai-disclaimer">
                <small>
                    <strong>Nota:</strong> Este análisis es generado por IA y debe ser revisado por un profesional calificado.
                    Las recomendaciones son orientativas y basadas en los datos proporcionados.
                </small>
            </div>
        `;

        if (targetContainer) {
            targetContainer.appendChild(aiAnalysisCard);
        }
    }

    // Formatear respuesta de la IA
    formatAIResponse(response) {
        let formattedResponse = response
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');

        formattedResponse = formattedResponse
            .replace(/(\d+\.\s.*?)(?=\d+\.\s|$)/g, '<li>$1</li>')
            .replace(/(-\s.*?)(?=-\s|$)/g, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

        return `<p>${formattedResponse}</p>`;
    }

    // Generar análisis comparativo entre evaluaciones
    async generateProgressAnalysis(evaluationHistory) {
        if (evaluationHistory.length < 2) {
            throw new Error('Se requieren al menos 2 evaluaciones para análisis de progreso');
        }

        const primera = evaluationHistory[0];
        const ultima = evaluationHistory[evaluationHistory.length - 1];
        
        const prompt = `
Como experto en análisis de progreso corporal, evalúa la evolución del cliente entre dos evaluaciones.

EVALUACIÓN INICIAL (${primera.fecha}):
- Peso: ${primera.peso} kg
- Grasa: ${primera.porcentajeGrasa?.toFixed(1)}%
- Masa magra: ${primera.masaMagraKg?.toFixed(1)} kg
- FFMI: ${primera.ffmi?.toFixed(1)}

EVALUACIÓN ACTUAL (${ultima.fecha}):
- Peso: ${ultima.peso} kg  
- Grasa: ${ultima.porcentajeGrasa?.toFixed(1)}%
- Masa magra: ${ultima.masaMagraKg?.toFixed(1)} kg
- FFMI: ${ultima.ffmi?.toFixed(1)}

CAMBIOS OBSERVADOS:
- Peso: ${(ultima.peso - primera.peso).toFixed(1)} kg
- Grasa: ${((ultima.porcentajeGrasa || 0) - (primera.porcentajeGrasa || 0)).toFixed(1)}%
- Masa magra: ${((ultima.masaMagraKg || 0) - (primera.masaMagraKg || 0)).toFixed(1)} kg

Días transcurridos: ${Math.ceil((new Date(ultima.fecha) - new Date(primera.fecha)) / (1000 * 60 * 60 * 24))}

Analiza:
1. Calidad del progreso obtenido
2. Velocidad de cambios vs. expectativas normales
3. Posibles causas de estancamientos o retrocesos
4. Ajustes recomendados en entrenamiento/nutrición
5. Proyección para los próximos 3 meses
6. Nuevas metas y objetivos sugeridos

Proporciona recomendaciones específicas basadas en la evolución observada.
`;

        const messages = [
            {
                role: "system", 
                content: "Eres un experto en análisis de progreso deportivo y composición corporal."
            },
            {
                role: "user",
                content: prompt
            }
        ];

        return await this.sendPrompt(messages, 0.6, 1500);
    }
}

// Funciones de integración para el sistema principal
const aiAnalysis = new AIAnalysisModule();

// Función para inicializar el módulo de IA
async function initializeAI() {
    try {
        const connected = await aiAnalysis.checkConnection();
        if (connected) {
            mostrarNotificacion('IA conectada exitosamente (Llama 3.1)', 'success');
            
            // Agregar indicador visual
            const header = document.querySelector('.header .subtitle');
            if (header && !document.getElementById('aiStatusIndicator')) {
                const statusSpan = document.createElement('span');
                statusSpan.id = 'aiStatusIndicator';
                statusSpan.innerHTML = ' • <span style="color: #10b981;">🤖 IA Activa</span>';
                header.appendChild(statusSpan);
            }
            
            // Agregar botón de control de IA en el header
            const headerElement = document.querySelector('.header');
            if (headerElement && !document.getElementById('aiControlPanel')) {
                const controlPanel = document.createElement('div');
                controlPanel.id = 'aiControlPanel';
                controlPanel.style.cssText = 'margin-top: 15px;';
                controlPanel.innerHTML = `
                    <button onclick="forceAIButtons()" style="background: #8b5cf6; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-size: 12px; cursor: pointer; margin: 0 5px;">
                        🚀 ACTIVAR BOTONES IA
                    </button>
                    <button onclick="testAIConnection()" style="background: #059669; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-size: 12px; cursor: pointer; margin: 0 5px;">
                        🔍 TEST CONEXIÓN
                    </button>
                `;
                headerElement.appendChild(controlPanel);
            }
            
        } else {
            mostrarNotificacion('IA no disponible. Verifica LM Studio en puerto 1234', 'warning');
        }
        return connected;
    } catch (error) {
        console.error('Error inicializando IA:', error);
        mostrarNotificacion('Error conectando con IA local', 'error');
        return false;
    }
}

// Función para forzar la adición de botones IA
function forceAIButtons() {
    console.log('=== FORZANDO BOTONES IA ===');
    
    if (Object.keys(currentAnalysis).length === 0) {
        mostrarNotificacion('Primero completa el análisis corporal', 'warning');
        return;
    }
    
    if (!aiAnalysis?.isConnected) {
        mostrarNotificacion('IA no está conectada. Usa TEST CONEXIÓN primero', 'error');
        return;
    }
    
    // Remover botones existentes
    document.querySelectorAll('[id*="aiBtn"], [id*="aiAnalysis"], [id*="aiProportions"], [id*="aiNutrition"]').forEach(btn => btn.remove());
    
    // Agregar botones con estilos garantizados
    const containers = [
        { id: 'analysisResults', btnId: 'aiAnalysisBtn', text: '🤖 Análisis Completo IA', action: 'complete' },
        { id: 'proportionsResults', btnId: 'aiProportionsBtn', text: '🤖 Análisis Proporciones IA', action: 'proportions' },
        { id: 'nutritionResults', btnId: 'aiNutritionBtn', text: '🤖 Plan Nutricional IA', action: 'nutrition' },
        { id: 'trainingResults', btnId: 'aiTrainingBtn', text: '💪 Programa Entrenamiento IA', action: 'training' }
    ];
    
    containers.forEach((container, index) => {
        setTimeout(() => {
            const targetDiv = document.getElementById(container.id);
            if (targetDiv) {
                const buttonContainer = document.createElement('div');
                buttonContainer.style.cssText = 'text-align: center; margin: 20px 0; padding: 15px; background: linear-gradient(135deg, #f3f4f6, #e5e7eb); border-radius: 12px; border: 2px dashed #8b5cf6;';
                buttonContainer.innerHTML = `
                    <button id="${container.btnId}" onclick="performAIAnalysis('${container.action}')" style="background: linear-gradient(135deg, #8b5cf6, #a855f7); color: white; padding: 12px 24px; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; font-size: 14px;">
                        ${container.text}
                    </button>
                `;
                targetDiv.appendChild(buttonContainer);
                console.log(`Botón agregado: ${container.text}`);
            }
        }, index * 300);
    });
    
    mostrarNotificacion('Botones IA agregados exitosamente!', 'success');
}

// Función para probar la conexión IA
async function testAIConnection() {
    try {
        mostrarNotificacion('Probando conexión con IA...', 'info');
        const connected = await aiAnalysis.checkConnection();
        
        if (connected) {
            mostrarNotificacion('✅ Conexión IA exitosa!', 'success');
            console.log('Estado IA:', {
                conectada: aiAnalysis.isConnected,
                url: aiAnalysis.apiUrl,
                modelo: aiAnalysis.model
            });
        } else {
            mostrarNotificacion('❌ No se pudo conectar con IA. Revisa LM Studio', 'error');
        }
    } catch (error) {
        mostrarNotificacion(`Error probando IA: ${error.message}`, 'error');
        console.error('Error:', error);
    }
}

// Función para realizar análisis con IA
async function performAIAnalysis(type) {
    if (Object.keys(currentAnalysis).length === 0) {
        mostrarNotificacion('Complete primero el análisis corporal', 'warning');
        return;
    }

    try {
        const aiResponse = await aiAnalysis.analyzeWithAI(currentAnalysis, type);
        aiAnalysis.displayAIAnalysis(aiResponse, type);
        mostrarNotificacion('Análisis con IA completado', 'success');
    } catch (error) {
        mostrarNotificacion(`Error en análisis con IA: ${error.message}`, 'error');
    }
}

// Función para análisis de progreso con IA
async function performProgressAnalysisAI() {
    if (evaluationHistory.length < 2) {
        mostrarNotificacion('Se requieren al menos 2 evaluaciones para análisis de progreso con IA', 'warning');
        return;
    }

    try {
        const progressAnalysis = await aiAnalysis.generateProgressAnalysis(evaluationHistory);
        
        const progressContainer = document.getElementById('progressContent');
        const aiProgressCard = document.createElement('div');
        aiProgressCard.className = 'card ai-analysis-card';
        aiProgressCard.innerHTML = `
            <div class="card-header">
                <div class="card-icon">🧠</div>
                <h3 class="card-title">Análisis de Progreso con IA</h3>
                <div class="ai-badge">
                    <span>Llama 3.1-8B</span>
                </div>
            </div>
            <div class="ai-response-content">
                ${aiAnalysis.formatAIResponse(progressAnalysis)}
            </div>
        `;
        
        progressContainer.appendChild(aiProgressCard);
        mostrarNotificacion('Análisis de progreso con IA completado', 'success');
        
    } catch (error) {
        mostrarNotificacion(`Error en análisis de progreso: ${error.message}`, 'error');
    }
}



// Inicializar IA al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando módulo IA...');
    setTimeout(initializeAI, 2000);
});