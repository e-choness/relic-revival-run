using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using FMODUnity;

public class AudioSettings : MonoBehaviour
{
    // Start is called before the first frame update
    
    FMOD.Studio.Bus SFX;
    FMOD.Studio.Bus Music;
    FMOD.Studio.Bus Master;

    public float MusicVolume = 0.5f;
    public float SFXVolume = 0.5f;
    public float MasterVolume = 1f;

    //GameObject mainMenuObject;


    void Awake()
    {
        //mainMenuObject = GameObject.Find("VolumeSettings");

        Music = FMODUnity.RuntimeManager.GetBus("bus:/Master/Music");
        SFX = FMODUnity.RuntimeManager.GetBus("bus:/Master/SFX");
        Master = FMODUnity.RuntimeManager.GetBus("bus:/Master");
        //Dialogue = FMODUnity.RuntimeManager.GetBus("bus:/Master/Dialogue");

    }

    void Update()
    {
        Music.setVolume(MusicVolume);
        SFX.setVolume(SFXVolume);
        Master.setVolume(MasterVolume);
       // Dialogue.setVolume(DialogueVolume);
        
        //UpdateValuesOnReopen();


    }

    public void MusicVolumeLevel(float newMusicVolume)
    {
        MusicVolume = newMusicVolume;

    }

    public void SFXVolumeLevel(float newSFXVolume)
    {
        SFXVolume = newSFXVolume;

    }

    public void MasterVolumeLevel(float newMasterVolume)
    {
        MasterVolume = newMasterVolume;
    }

    
    


}
