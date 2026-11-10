// forms
const chatSubmit = document.getElementById('chatInputContainer')
const emptyState = document.querySelector('#chatEmptyState')
const inputField = document.getElementById('chatInputField')
const userInput = inputField.value
const chatSubmitButton = document.getElementById('chatSubmit')
const chatSubmitButtonIMG = document.getElementById('chatSubmitIMG')

// output
const chatResponseLog = document.querySelector('.chatResponseLog')
const responseContainer = document.querySelector('.chatResponseContainer')
const loader = document.querySelector('.loadingIndicator')
const query = document.querySelector('.chatQuery p')
const AiResponse = document.querySelector('.chatResponseLog p')
const AiResponseBlurb = document.querySelector('.chatBlurb p')
const AiResponseCardHeader = document.querySelector('.chatCardHeader p')
const AiResponseCardDescription = document.querySelector('.chatCardDescription p')
const URL = document.querySelector('.chatCardURL')
const AiResponseCardURL = document.querySelector('.chatCardURL a')
const AiResponseCardImage = document.querySelector('.chatCardImage')
// store data from responses below
let data

function handleInput() {
    const trimmedValue = inputField.value.trim();
    chatSubmitButton.disabled = trimmedValue === '';
    chatSubmitButtonIMG.style.opacity = trimmedValue === '' ? 0.25 : 1;
}
chatSubmit.addEventListener('input', handleInput);

function hideLoader() {
    loader.style.visibility = 'hidden'
    loader.style.opacity = 0
    loader.style.height = '0px'
}

function showResponse() {
    chatResponseLog.style.transform = 'translateY(0)'
    responseContainer.style.visibility = 'visible'
    responseContainer.style.opacity = 0
    responseContainer.style.transition = 'transform 0.5s ease-in-out'
    responseContainer.style.transform = 'translateY(0)'
    setTimeout(() => {
        responseContainer.style.transition = 'opacity 2s'
        responseContainer.style.opacity = 1
    }, 100);
}

// The card stays hidden until a recommendation arrives. A failed call otherwise
// leaves the spinner up, because AiResponse is missing and JSON.parse throws.
function showChatFailure() {
    hideLoader()
    if (URL) URL.style.display = 'none'
    if (AiResponseBlurb) AiResponseBlurb.textContent = 'Something went wrong on my side. Try again in a moment.'
    showResponse()
    inputField.value = query.textContent
    handleInput()
}

chatSubmit.addEventListener('submit', async (e) => {
    e.preventDefault()
    inputField.blur()
    chatSubmitButtonIMG.style.opacity = 0.25;
    chatSubmitButton.disabled = true;

    // display the chatResponseLog
    emptyState.style.display = 'none'
    chatResponseLog.style.transition = 'opacity 2s'
    chatResponseLog.style.opacity = 0
    chatResponseLog.style.visibility = 'visible'
    chatResponseLog.style.transition = 'transform 0.5s ease-in-out, opacity 2s'
    chatResponseLog.style.transform = 'translateY(0)'
    chatResponseLog.style.opacity = 1
    responseContainer.style.opacity = 0
    responseContainer.style.visibility = 'hidden'
    responseContainer.style.transition = 'opacity 2s'
    chatResponseLog.style.transform = 'translateY(33%)'

    // Grab user input
    const userInput = inputField.value  
    query.textContent = inputField.value
    inputField.value = ''
    loader.style.height = '80px'
    loader.style.visibility = 'visible'
    if (URL) URL.style.display = ''
    setTimeout(() => {
        loader.style.transition = 'opacity 0.5s'
        loader.style.opacity = 1
    }, 100);

    await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: userInput })
    });

    try {
        const res = await fetch('/api/openai/meta', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ defineProblem: userInput })
        })
        data = await res.json()
        if (!res.ok || typeof data.AiResponse !== 'string') {
            showChatFailure()
            return
        }

        const contentObject = JSON.parse(data.AiResponse)
        const blurb = contentObject.blurb
        const cardHeader = contentObject.cardHeader
        const cardDescription = contentObject.cardDescription
        const cardURL = contentObject.cardURL
        const cardImage = contentObject.cardImage
        if (AiResponseBlurb) AiResponseBlurb.textContent = blurb
        if (AiResponseCardHeader) AiResponseCardHeader.textContent = cardHeader
        if (AiResponseCardDescription) AiResponseCardDescription.textContent = cardDescription
        if (AiResponseCardURL) AiResponseCardURL.href = cardURL
        if (AiResponseCardImage) AiResponseCardImage.src = cardImage
        hideLoader()
        showResponse()
    } catch (error) {
        console.error(error)
        showChatFailure()
    }
})
