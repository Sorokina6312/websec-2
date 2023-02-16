let saved_stop = []
let map;

window.onload = async () => {
    if(localStorage.getItem('saved_stop')!=null){
        saved_stop = JSON.parse(localStorage.getItem('saved_stop'))
        regenerateSavedStop()
    }

    mapboxgl.accessToken = 'pk.eyJ1Ijoic2luZS1hbGlzIiwiYSI6ImNraHYxamh4MTEydm8ycnBpamlxeXc3ZmUifQ.VaDR_QSf9xan1ksiBSNejA';
    map = new mapboxgl.Map({
        container: 'map',
        pitch: 50, //если будет подвисать - закомментируйте этот параметр
        //style: 'mapbox://styles/mapbox/satellite-streets-v12',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [50.13, 53.19],
        zoom: 9
    });

    map.on('style.load', () => {
        map.addSource('mapbox-dem', {
            'type': 'raster-dem',
            'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
            'tileSize': 512,
            'maxzoom': 14
        });
        map.setTerrain({'source': 'mapbox-dem', 'exaggeration': 1.5});
    });
    await getFullDB().then(async stops => {
        stops.stops.stop.map(stop =>{
            if(isEmpty(stop.adjacentStreet)){
                stop.adjacentStreet = ""
            }
            if(isEmpty(stop.direction)){
                stop.direction = ""
            }
            const popup = new mapboxgl.Popup({offset: 25})
            popup.on('open', async () => {
                console.log(stop)
                let stop_info = await getFirstArrivalToStop(stop.KS_ID)
                let popup_window = document.createElement("div");
                popup_window.className = "popup-window"
                let popup_title = document.createElement("h2");
                popup_title.textContent = stop.title
                popup_window.append(popup_title)
                let popup_subtitle = document.createElement("h4");
                popup_subtitle.textContent = "Остановка " + stop.adjacentStreet + " " + stop.direction
                popup_window.append(popup_subtitle)

                stop_info.arrival.map(transport =>{
                    let transport_module = document.createElement("div");
                    let transport_info = document.createElement("p");
                    transport_info.textContent = transport.type + " " + transport.number + " будет через " + transport.time + " минут"
                    transport_module.append(transport_info)
                    popup_window.append(transport_module)
                })

                const save_stop_button = document.createElement("button");
                save_stop_button.textContent = "Избранное"
                save_stop_button.className = "save-stop-button"

                save_stop_button.addEventListener("click", ()=>{
                    if(checkInSaved(stop.KS_ID)){
                        saved_stop = saved_stop.filter((filter_stop) => { return filter_stop.KS_ID !== stop.KS_ID });
                        regenerateSavedStop()
                    }
                    else
                    {
                        saved_stop.push({
                            KS_ID: stop.KS_ID,
                            title: stop.title,
                            info: "Остановка " + stop.adjacentStreet + " " + stop.direction,
                            metrics: {
                                x: parseFloat(stop.latitude),
                                y: parseFloat(stop.longitude) }
                        })
                        regenerateSavedStop()
                        console.log("Delete")
                    }
                    localStorage.setItem("saved_stop", JSON.stringify(saved_stop));
                    console.log(saved_stop)
                })

                popup_window.append(save_stop_button)

                popup.setDOMContent(
                    popup_window
                )
            });

            new mapboxgl.Marker({color: 'red'})
                .setLngLat([stop.longitude,stop.latitude])
                .setPopup(popup)
                .addTo(map);
        })
    })
}

function isEmpty(obj) {
    for(let key in obj) {
        return false;
    }
    return true;
}

function checkInSaved(KS_ID){
    if(saved_stop !== null){
        return !!saved_stop.filter(function (stop) {
            return stop.KS_ID === KS_ID;
        }).length;
    }
}

function getFullDB(){
    return fetch("https://tosamara.ru/api/v2/classifiers/stopsFullDB.xml")
        .then(response => response.text())
        .then(str => {
                return xmlToJson.parse(new DOMParser().parseFromString(str, "application/xml"));
            }
        )
}

function getFirstArrivalToStop(KS_ID) {
    return sha1(KS_ID + "just_f0r_tests").then((response)=>{
        return response
    })
        .then(async (data) => {
            return await fetch(`https://tosamara.ru/api/v2/json?method=getFirstArrivalToStop&KS_ID=${KS_ID}&os=android&clientid=test&authkey=${data}`)
                .then(
                    response => response.json())
                .then(str => {
                    return str;
                })
        })
}

function regenerateSavedStop(){
    let window_saved_stop = document.getElementsByClassName("map-overlay-transport")[0]
    window_saved_stop.innerHTML = ''
    saved_stop.map(stop =>{
        let transport_saved_stop = document.createElement("div")
        transport_saved_stop.className = "transport-saved-stop-info"
        let transport_saved_stop_title = document.createElement("h2");
        transport_saved_stop_title.textContent = stop.title
        transport_saved_stop.append(transport_saved_stop_title)
        let transport_saved_stop_subtitle = document.createElement("h4");
        transport_saved_stop_subtitle.textContent = stop.info
        transport_saved_stop.append(transport_saved_stop_subtitle)
        transport_saved_stop.addEventListener("click", ()=>{
            map.setCenter({lng: stop.metrics.y, lat: stop.metrics.x})
            map.setZoom(14)
        })
        window_saved_stop.append(transport_saved_stop)
    })
}

async function sha1(str) {
    const msgUint8 = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-1", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

