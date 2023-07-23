using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class GameManager : MonoBehaviour
{
    [SerializeField] GameObject[] spawnObject;
    [SerializeField] GameObject[] spawnPoints;
    [SerializeField] float timer;
    [SerializeField] float timeBetweenSpawns;

    // public float speedMultiplier { get; set=>; }

    // Start is called before the first frame update
    void Start()
    {
        
    }

    // Update is called once per frame
    private void Update()
    {
        CountTimer();
    }

    private void CountTimer()
    {
        // speedMultiplier += Time.deltaTime * 0.1f;
        timer += Time.deltaTime;

        if (timer > timeBetweenSpawns)
        {
            timer = 0;
            var randPointsIndex = Random.Range(0, 3);
            var randObjectIndex = Random.Range(0, 3);
            Instantiate(spawnObject[randObjectIndex], spawnPoints[randPointsIndex].transform.position, Quaternion.identity);
        }
    }
}
