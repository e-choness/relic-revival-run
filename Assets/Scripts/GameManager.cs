using System;
using System.Collections.Generic;
using Player;
using Spawns;
using TMPro;
using UI;
using UnityEngine;
using Random = UnityEngine.Random;

public class GameManager : MonoBehaviour
{
    [SerializeField] List<GameObject> spawnObject;
    [SerializeField] List<GameObject> spawnPoints;
    [SerializeField] float timer;
    [SerializeField] float timeBetweenSpawns;
    [SerializeField] private GameObject playerController;
    [SerializeField] private GameObject backgroundScroller;
    [SerializeField] private GameObject endMenu;
    [SerializeField] private TextMeshProUGUI endScoreText;
    private PlayerController playerControllerScript;
    private BackgroundScroller backgroundScrollerScript;
    private float score; 
    private int spawnCount;
    private int scoreCount;

    public bool flipSpawnPoint = true;
    // private bool isFinished;

    private void Start()
    {
        spawnCount = 0;
        endMenu.SetActive(false);
        playerControllerScript = playerController.GetComponent<PlayerController>();
        backgroundScrollerScript = backgroundScroller.GetComponent<BackgroundScroller>();
    }
    // Update is called once per frame
    private void Update()
    {
        CountTimer();
        CalculateScore();
        GoToNextLevel();
    }

    private void CountTimer()
    {
        // speedMultiplier += Time.deltaTime * 0.1f;
        timer += Time.deltaTime;

        if (timer > timeBetweenSpawns && !backgroundScrollerScript.CheckFinished())
        {
            timer = 0;
            spawnCount += 1;
            var randPointsIndex = Random.Range(0, 3);
            var randObjectIndex = Random.Range(0, spawnObject.Count);
            var spawn = Instantiate(spawnObject[randObjectIndex], spawnPoints[randPointsIndex].transform.position, Quaternion.identity);
            if (flipSpawnPoint)
            {
                Debug.Log("Flips");
                spawn.transform.position = new Vector3(spawn.transform.position.x * -1, spawn.transform.position.y, spawn.transform.position.z);
            }
            var spawnComponent = spawn.GetComponent<SpawnObjectScript>();
            spawnComponent.spawnType = randObjectIndex;
        }
    }

    private void CalculateScore()
    {
        scoreCount = playerControllerScript.GetScore();
        score = ((float)scoreCount / spawnCount) * 100;
        // #if UNITY_EDITOR
        // Debug.Log(message: score.ToString());
        // #endif
    }

    private void GoToNextLevel()
    {
        if (backgroundScrollerScript.CheckFinished())
        {
            // Time.timeScale = 0.0f;
            endScoreText.text = $"You have restored {Math.Round(score,2).ToString()}% of the relic!";
            endMenu.SetActive(true);
        }
        
    }
}
