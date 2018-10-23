import React, { Component } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  View,
  ActivityIndicator,
  FlatList
} from 'react-native';
import Tts from 'react-native-tts';

// In order to avoid error relate to not finding module react-transform-hmr
// rm -rf $TMPDIR/react-*; rm -rf $TMPDIR/haste-*; rm -rf $TMPDIR/metro-*; watchman watch-del-all
// react-native start  --reset-cache

// every minute, when the app is still in the background, poll POI's and check if the nearest POI is closer
// than distance_treshold. If so, read description out loud

export default class RealReality extends Component {

  constructor(props){
    super(props);
    this.state = {
      isLoading: true,
      latitude: null,
      longitude: null,
      error: null,
      token: null,
      notification: null,
      poi: null,
      title: 'RealReality',
      body: 'Im feeling so reeeaaaaaal....!',
    };
  }

  getGeoLocationPromise() {
    return new Promise(function(resolve, reject) {
      console.log("getGeoLocationPromise");
      navigator.geolocation.getCurrentPosition(
        (position) => {
            coords = [position.coords.latitude,position.coords.longitude];
            resolve(coords);
          });
        },
        (error) => {
          this.setState({ error: error.message });
          reject(error.message);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 },
      )
  }

  getPOIs(){
    url = 'https://realreality.be/json/'+this.state.latitude+'/'+this.state.longitude;
    console.log(url);
    fetch(url)
     .then((response) => response.json())
     .then((responseJson) => {
       this.setState({
         dataSource: responseJson
       }, function(){
         console.log("POI's read");
         console.log(this.state.latitude);
         console.log(this.state.longitude);
         console.log(responseJson.pois);
         Tts.speak(responseJson.pois[0]['abstract']['value']);
       });
     })
     .catch((error) =>{
       console.error(error);
     });
  }

  componentDidMount(){
    this.getGeoLocationPromise().then(
      result => {
        this.setState({
          latitude: coords[0],
          longitude: coords[1],
          error: null,
        });
        this.getPOIs();
      },
      error => {
        this.setState({
          error: error,
        });
        console.log(error)
      }
    )

  }


  render(){

    /*if(this.state.isLoading){
      return(
        <View style={{flex: 1, padding: 20}}>
          <ActivityIndicator/>
        </View>
      )
    }*/

    return(

       <KeyboardAvoidingView style={styles.container} behavior="padding">
               <Text>RealRealityv0.2</Text>
               <Text>Latitude: {this.state.latitude}</Text>
               <Text>Longitude: {this.state.longitude}</Text>
               {this.state.error ? <Text>Error: {this.state.error}</Text> : null}
               <TouchableOpacity
                 onPress={() => this.registerForPushNotifications()}
                 style={styles.touchable}>
                 <Text>Register me for notifications!</Text>
               </TouchableOpacity>
               <TouchableOpacity onPress={() => this.sendDelayedPushNotification()} style={styles.touchable}>
                 <Text>Send me a notification!</Text>
               </TouchableOpacity>
               <View>
                 <Text style={styles.text}>POIS</Text>
                 <FlatList
                  data={this.state.dataSource}
                  //renderItem={({item}) => <Text>{item.label.value}, {item.subject.value}</Text>}
                  renderItem={({item}) => (
                    <Text> test </Text>
                    //<Text>{item.abstract.value}</Text>
                    )}
                  keyExtractor={item => item.subject.value}
                 />
               </View>
               {this.state.token ? (
                 <View>
                   <Text style={styles.text}>Token</Text>
                   <TextInput
                     style={styles.input}
                     onChangeText={token => this.setState({ token })}
                     value={this.state.token}
                   />
                 </View>
               ) : null}
               {this.state.notification ? (
                 <View>
                   <Text style={styles.text}>Last Notification:</Text>
                   <Text style={styles.text}>{JSON.stringify(this.state.notification.data.message)}</Text>
                 </View>
               ) : null}
         </KeyboardAvoidingView>

    );
  }
}
const styles = StyleSheet.create({
  title: {
    backgroundColor: '#0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 18,
    padding: 8,
  },
  text: {
    backgroundColor: '#0f0',
    paddingBottom: 2,
    padding: 8,
  },
  container: {
    backgroundColor: '#0f0',
    flex: 1,
    paddingTop: 40,
  },
  touchable: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderRadius: 4,
    margin: 8,
    padding: 8,
    width: '95%',
  },
  input: {
    height: 40,
    borderWidth: 1,
    margin: 8,
    padding: 8,
    width: '95%',
  },
});
